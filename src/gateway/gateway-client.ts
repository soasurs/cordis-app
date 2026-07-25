import {
  GatewayEventType,
  GatewayOpcode,
  getReadySessionId,
  parseGatewayEnvelope,
  parseHelloData,
  type GatewayDispatch,
  type GatewayEnvelope,
  type GatewayErrorData,
  type GatewayIdentifyData,
  type GatewayPresenceData,
  type GatewayResumeData,
} from '@/gateway/protocol'

const websocketConnecting = 0
const websocketOpen = 1

export type GatewayConnectionState = 'idle' | 'connecting' | 'reconnecting' | 'ready'

export interface GatewaySession {
  sessionId: string
  sequence: number
}

export interface GatewayIdentifyOptions {
  deviceType?: string
  status?: string
  clientState?: string
}

export interface GatewayReconnectOptions {
  initialDelayMs?: number
  maximumDelayMs?: number
  jitter?: number
}

export interface GatewaySocket {
  readonly readyState: number
  onopen: ((event: Event) => void) | null
  onmessage: ((event: MessageEvent) => void) | null
  onerror: ((event: Event) => void) | null
  onclose: ((event: CloseEvent) => void) | null
  send(data: string): void
  close(code?: number, reason?: string): void
}

export interface GatewayClientOptions {
  getAccessToken: () => string | null | Promise<string | null>
  url?: string
  identify?: GatewayIdentifyOptions
  reconnect?: GatewayReconnectOptions
  webSocketFactory?: (url: string) => GatewaySocket
  random?: () => number
}

export interface GatewayStateChange {
  current: GatewayConnectionState
  previous: GatewayConnectionState
}

export class GatewayClientError extends Error {
  readonly code: string

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'GatewayClientError'
    this.code = code
  }
}

type DispatchListener = (dispatch: GatewayDispatch) => void
type ErrorListener = (error: GatewayClientError) => void
type StateListener = (change: GatewayStateChange) => void

export class GatewayClient {
  private readonly getAccessToken: GatewayClientOptions['getAccessToken']
  private readonly identify: GatewayIdentifyOptions
  private readonly initialReconnectDelayMs: number
  private readonly maximumReconnectDelayMs: number
  private readonly reconnectJitter: number
  private readonly random: () => number
  private readonly url: string
  private readonly webSocketFactory: (url: string) => GatewaySocket
  private readonly dispatchListeners = new Set<DispatchListener>()
  private readonly errorListeners = new Set<ErrorListener>()
  private readonly stateListeners = new Set<StateListener>()

  private heartbeatIntervalMs: number | null = null
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatUnacknowledged = false
  private reconnectAttempt = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private running = false
  private socket: GatewaySocket | null = null
  private stateValue: GatewayConnectionState = 'idle'
  private sessionValue: GatewaySession | null = null

  constructor(options: GatewayClientOptions) {
    this.getAccessToken = options.getAccessToken
    this.identify = options.identify ?? {}
    this.initialReconnectDelayMs = options.reconnect?.initialDelayMs ?? 1_000
    this.maximumReconnectDelayMs = options.reconnect?.maximumDelayMs ?? 30_000
    this.reconnectJitter = options.reconnect?.jitter ?? 0.2
    this.random = options.random ?? Math.random
    this.url = options.url ?? defaultGatewayUrl()
    this.webSocketFactory = options.webSocketFactory ?? ((url) => new WebSocket(url))

    if (this.initialReconnectDelayMs < 0 || this.maximumReconnectDelayMs < 0) {
      throw new Error('gateway reconnect delays must not be negative')
    }
    if (this.reconnectJitter < 0 || this.reconnectJitter > 1) {
      throw new Error('gateway reconnect jitter must be between 0 and 1')
    }
  }

  get state(): GatewayConnectionState {
    return this.stateValue
  }

  get session(): GatewaySession | null {
    return this.sessionValue ? { ...this.sessionValue } : null
  }

  connect(): void {
    if (this.running) {
      return
    }
    this.running = true
    this.reconnectAttempt = 0
    this.openSocket(false)
  }

  disconnect({ preserveSession = false }: { preserveSession?: boolean } = {}): void {
    this.running = false
    this.clearHeartbeat()
    this.clearReconnectTimer()
    if (!preserveSession) {
      this.sessionValue = null
    }
    const socket = this.socket
    this.socket = null
    if (
      socket &&
      (socket.readyState === websocketConnecting || socket.readyState === websocketOpen)
    ) {
      socket.close(1000, 'client disconnected')
    }
    this.setState('idle')
  }

  resetSession(): void {
    this.sessionValue = null
  }

  updatePresence(presence: GatewayPresenceData): void {
    if (this.stateValue !== 'ready') {
      throw new Error('gateway is not ready')
    }
    this.send({ op: GatewayOpcode.Presence, d: presence })
  }

  onDispatch(listener: DispatchListener): () => void {
    this.dispatchListeners.add(listener)
    return () => this.dispatchListeners.delete(listener)
  }

  onError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener)
    return () => this.errorListeners.delete(listener)
  }

  onStateChange(listener: StateListener): () => void {
    this.stateListeners.add(listener)
    return () => this.stateListeners.delete(listener)
  }

  private openSocket(reconnecting: boolean): void {
    if (!this.running) {
      return
    }
    this.setState(reconnecting ? 'reconnecting' : 'connecting')

    let socket: GatewaySocket
    try {
      socket = this.webSocketFactory(this.url)
    } catch (cause) {
      this.reportError('connection_failed', 'create gateway websocket failed', cause)
      this.scheduleReconnect()
      return
    }

    this.socket = socket
    socket.onopen = () => {
      if (socket !== this.socket) {
        return
      }
      this.heartbeatIntervalMs = null
      this.heartbeatUnacknowledged = false
    }
    socket.onmessage = (event) => {
      if (socket !== this.socket) {
        return
      }
      this.handleMessage(socket, event.data)
    }
    socket.onerror = () => {
      if (socket === this.socket) {
        this.reportError('websocket_error', 'gateway websocket reported an error')
      }
    }
    socket.onclose = () => {
      if (socket !== this.socket) {
        return
      }
      this.socket = null
      this.clearHeartbeat()
      if (this.running) {
        this.scheduleReconnect()
      } else {
        this.setState('idle')
      }
    }
  }

  private handleMessage(socket: GatewaySocket, data: unknown): void {
    if (typeof data !== 'string') {
      this.reportError('invalid_payload', 'gateway sent a non-text message')
      this.forceReconnect(socket)
      return
    }

    let envelope: GatewayEnvelope
    try {
      envelope = parseGatewayEnvelope(data)
    } catch (cause) {
      this.reportError('invalid_payload', 'parse gateway message failed', cause)
      this.forceReconnect(socket)
      return
    }

    switch (envelope.op) {
      case GatewayOpcode.Hello:
        if (!this.validateEventType(socket, envelope, GatewayEventType.Hello)) {
          return
        }
        void this.handleHello(socket, envelope.d)
        break
      case GatewayOpcode.Dispatch:
        this.handleDispatch(envelope)
        break
      case GatewayOpcode.HeartbeatAck:
        if (!this.validateEventType(socket, envelope, GatewayEventType.HeartbeatAck)) {
          return
        }
        this.heartbeatUnacknowledged = false
        break
      case GatewayOpcode.Reconnect:
        this.forceReconnect(socket)
        break
      case GatewayOpcode.InvalidSession:
        this.sessionValue = null
        this.forceReconnect(socket)
        break
      case GatewayOpcode.Error:
        if (!this.validateEventType(socket, envelope, GatewayEventType.Error)) {
          return
        }
        this.handleGatewayError(envelope.d)
        break
      default:
        this.reportError('unsupported_opcode', `gateway sent unsupported opcode ${envelope.op}`)
    }
  }

  private async handleHello(socket: GatewaySocket, data: unknown): Promise<void> {
    let heartbeatIntervalMs: number
    try {
      heartbeatIntervalMs = parseHelloData(data).heartbeat_interval_ms
    } catch (cause) {
      this.reportError('invalid_hello', 'parse gateway hello failed', cause)
      this.forceReconnect(socket)
      return
    }

    let token: string | null
    try {
      token = await this.getAccessToken()
    } catch (cause) {
      this.reportError('token_unavailable', 'get gateway access token failed', cause)
      this.stopSocket(socket)
      return
    }
    if (socket !== this.socket || !this.running) {
      return
    }
    if (!token) {
      this.reportError('token_unavailable', 'gateway access token is unavailable')
      this.stopSocket(socket)
      return
    }

    this.heartbeatIntervalMs = heartbeatIntervalMs
    if (this.sessionValue) {
      const resume: GatewayResumeData = {
        token,
        session_id: this.sessionValue.sessionId,
        seq: this.sessionValue.sequence,
      }
      this.sendOnSocket(socket, {
        op: GatewayOpcode.Resume,
        t: GatewayEventType.Resume,
        d: resume,
      })
      return
    }

    const identify: GatewayIdentifyData = {
      token,
      device_type: this.identify.deviceType,
      status: this.identify.status,
      client_state: this.identify.clientState,
    }
    this.sendOnSocket(socket, {
      op: GatewayOpcode.Identify,
      t: GatewayEventType.Identify,
      d: identify,
    })
  }

  private handleDispatch(envelope: GatewayEnvelope): void {
    if (!envelope.t) {
      this.reportError('invalid_dispatch', 'gateway dispatch type is missing')
      return
    }

    const sequence = envelope.s ?? this.sessionValue?.sequence ?? 0
    if (envelope.t === GatewayEventType.Ready) {
      const sessionId = getReadySessionId(envelope.d)
      if (!sessionId) {
        this.reportError('invalid_ready', 'gateway ready session id is missing')
        return
      }
      this.sessionValue = { sessionId, sequence }
      this.markReady()
    } else {
      if (this.sessionValue && sequence > this.sessionValue.sequence) {
        this.sessionValue.sequence = sequence
      }
      if (envelope.t === GatewayEventType.Resumed) {
        this.markReady()
      }
    }

    const dispatch: GatewayDispatch = {
      type: envelope.t,
      sequence,
      data: envelope.d,
    }
    for (const listener of this.dispatchListeners) {
      try {
        listener(dispatch)
      } catch (cause) {
        this.reportError('dispatch_listener_failed', 'gateway dispatch listener failed', cause)
      }
    }
  }

  private markReady(): void {
    this.reconnectAttempt = 0
    this.setState('ready')
    this.startHeartbeat()
  }

  private startHeartbeat(): void {
    this.clearHeartbeat()
    const interval = this.heartbeatIntervalMs
    if (!interval) {
      this.reportError('heartbeat_unavailable', 'gateway heartbeat interval is unavailable')
      return
    }
    this.heartbeatTimer = setTimeout(() => this.heartbeatTick(), interval)
  }

  private heartbeatTick(): void {
    this.heartbeatTimer = null
    const socket = this.socket
    if (!socket || this.stateValue !== 'ready') {
      return
    }
    if (this.heartbeatUnacknowledged) {
      this.reportError('heartbeat_timeout', 'gateway heartbeat was not acknowledged')
      this.forceReconnect(socket)
      return
    }

    this.sendOnSocket(socket, {
      op: GatewayOpcode.Heartbeat,
      t: GatewayEventType.Heartbeat,
      d: this.sessionValue?.sequence ?? 0,
    })
    this.heartbeatUnacknowledged = true
    if (this.heartbeatIntervalMs) {
      this.heartbeatTimer = setTimeout(() => this.heartbeatTick(), this.heartbeatIntervalMs)
    }
  }

  private handleGatewayError(data: unknown): void {
    if (
      typeof data === 'object' &&
      data !== null &&
      'code' in data &&
      typeof data.code === 'string' &&
      'message' in data &&
      typeof data.message === 'string'
    ) {
      const error = data as GatewayErrorData
      this.reportError(error.code, error.message)
      return
    }
    this.reportError('gateway_error', 'gateway returned an invalid error payload')
  }

  private validateEventType(
    socket: GatewaySocket,
    envelope: GatewayEnvelope,
    expected: GatewayEventType,
  ): boolean {
    if (envelope.t === expected) {
      return true
    }
    this.reportError(
      'invalid_event_type',
      `gateway opcode ${envelope.op} must use event type ${expected}`,
    )
    this.forceReconnect(socket)
    return false
  }

  private forceReconnect(socket: GatewaySocket): void {
    if (socket !== this.socket) {
      return
    }
    this.socket = null
    this.clearHeartbeat()
    socket.close(1012, 'reconnect requested')
    this.scheduleReconnect(0)
  }

  private stopSocket(socket: GatewaySocket): void {
    if (socket !== this.socket) {
      return
    }
    this.running = false
    this.socket = null
    this.clearHeartbeat()
    socket.close(1000, 'authentication unavailable')
    this.setState('idle')
  }

  private scheduleReconnect(delayOverride?: number): void {
    if (!this.running || this.reconnectTimer) {
      return
    }
    this.setState('reconnecting')
    const delay = delayOverride ?? this.nextReconnectDelay()
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.openSocket(true)
    }, delay)
  }

  private nextReconnectDelay(): number {
    const exponentialDelay = Math.min(
      this.initialReconnectDelayMs * 2 ** this.reconnectAttempt,
      this.maximumReconnectDelayMs,
    )
    this.reconnectAttempt += 1
    const jitterMultiplier = 1 + (this.random() * 2 - 1) * this.reconnectJitter
    return Math.max(0, Math.round(exponentialDelay * jitterMultiplier))
  }

  private send(envelope: GatewayEnvelope): void {
    const socket = this.socket
    if (!socket) {
      throw new Error('gateway websocket is unavailable')
    }
    this.sendOnSocket(socket, envelope)
  }

  private sendOnSocket(socket: GatewaySocket, envelope: GatewayEnvelope): void {
    if (socket !== this.socket || socket.readyState !== websocketOpen) {
      throw new Error('gateway websocket is not open')
    }
    socket.send(JSON.stringify(envelope))
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    this.heartbeatUnacknowledged = false
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private setState(current: GatewayConnectionState): void {
    if (current === this.stateValue) {
      return
    }
    const previous = this.stateValue
    this.stateValue = current
    for (const listener of this.stateListeners) {
      listener({ current, previous })
    }
  }

  private reportError(code: string, message: string, cause?: unknown): void {
    const options = cause === undefined ? undefined : { cause }
    const error = new GatewayClientError(code, message, options)
    for (const listener of this.errorListeners) {
      listener(error)
    }
  }
}

function defaultGatewayUrl(): string {
  const configuredUrl = import.meta.env.VITE_GATEWAY_URL?.trim()
  if (!configuredUrl) {
    throw new Error('VITE_GATEWAY_URL is not configured')
  }

  let url: URL
  try {
    url = new URL(configuredUrl)
  } catch (cause) {
    throw new Error('VITE_GATEWAY_URL is invalid', { cause })
  }

  if (url.protocol !== 'ws:' && url.protocol !== 'wss:') {
    throw new Error('VITE_GATEWAY_URL must use ws or wss')
  }
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error('VITE_GATEWAY_URL must not include a path, query, or fragment')
  }

  return url.origin
}
