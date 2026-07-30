/** Wire envelope. Field names stay snake_case to match gateway JSON. */
export interface GatewayEnvelope<T = unknown> {
  op: number
  /** Monotonic sequence; required for resume. Absent on some control frames. */
  s?: number
  t?: string
  d?: T
}

export interface GatewayHelloData {
  heartbeat_interval_ms: number
  gateway_id: string
}

export type GatewayPresenceStatus = 'online' | 'idle' | 'dnd' | 'invisible'
export type GatewayClientState = 'foreground' | 'background'

export interface GatewayIdentifyData {
  gateway_ticket: string
  device_type?: string
  status?: GatewayPresenceStatus
  client_state?: GatewayClientState
}

export interface GatewayResumeData {
  gateway_ticket: string
  session_id: string
  /** Last received dispatch sequence from this session. */
  seq: number
}

export interface GatewayPresenceData {
  status?: GatewayPresenceStatus
  client_state?: GatewayClientState
}

export interface GatewayErrorData {
  code: string
  message: string
}

/** Structural checks only; domain payload shape is validated by consumers. */
export function parseGatewayEnvelope(value: string): GatewayEnvelope {
  const parsed: unknown = JSON.parse(value)
  if (!isRecord(parsed) || typeof parsed.op !== 'number' || !Number.isInteger(parsed.op)) {
    throw new Error('gateway envelope opcode is invalid')
  }
  if (
    parsed.s !== undefined &&
    (typeof parsed.s !== 'number' || !Number.isSafeInteger(parsed.s) || parsed.s < 0)
  ) {
    throw new Error('gateway envelope sequence is invalid')
  }
  if (parsed.t !== undefined && typeof parsed.t !== 'string') {
    throw new Error('gateway envelope type is invalid')
  }
  return parsed as unknown as GatewayEnvelope
}

export function parseHelloData(value: unknown): GatewayHelloData {
  if (
    !isRecord(value) ||
    typeof value.heartbeat_interval_ms !== 'number' ||
    !Number.isSafeInteger(value.heartbeat_interval_ms) ||
    value.heartbeat_interval_ms <= 0 ||
    typeof value.gateway_id !== 'string'
  ) {
    throw new Error('gateway hello payload is invalid')
  }
  return value as unknown as GatewayHelloData
}

/** Returns null when ready data is incomplete so the client can reject the session safely. */
export function getReadySessionId(value: unknown): string | null {
  if (!isRecord(value) || typeof value.session_id !== 'string' || value.session_id.length === 0) {
    return null
  }
  return value.session_id
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
