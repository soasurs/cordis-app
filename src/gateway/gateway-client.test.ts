import { afterEach, describe, expect, it, vi } from 'vitest'

import { GatewayClient, type GatewaySocket } from '@/gateway/gateway-client'
import { GatewayEventType, GatewayOpcode, type GatewayEnvelope } from '@/gateway/protocol'

class FakeGatewaySocket implements GatewaySocket {
  readyState = 0
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  readonly sent: GatewayEnvelope[] = []

  open() {
    this.readyState = 1
    this.onopen?.(new Event('open'))
  }

  receive(envelope: GatewayEnvelope) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(envelope) }))
  }

  send(data: string) {
    this.sent.push(JSON.parse(data) as GatewayEnvelope)
  }

  close(code = 1000, reason = '') {
    if (this.readyState === 3) {
      return
    }
    this.readyState = 3
    this.onclose?.({ code, reason, wasClean: code === 1000 } as CloseEvent)
  }

  fail(code = 1006) {
    this.close(code, 'connection lost')
  }
}

function createHarness(getGatewayTicket: () => string | Promise<string> = () => 'ticket') {
  const sockets: FakeGatewaySocket[] = []
  const client = new GatewayClient({
    url: 'ws://cordis.test',
    getGatewayTicket,
    identify: {
      deviceType: 'web',
      status: 'online',
      clientState: 'foreground',
    },
    reconnect: {
      initialDelayMs: 100,
      maximumDelayMs: 1_000,
      jitter: 0,
    },
    webSocketFactory: () => {
      const socket = new FakeGatewaySocket()
      sockets.push(socket)
      return socket
    },
  })
  return { client, sockets }
}

async function receiveHello(socket: FakeGatewaySocket, interval = 1_000) {
  socket.open()
  socket.receive({
    op: GatewayOpcode.Hello,
    t: GatewayEventType.Hello,
    d: { heartbeat_interval_ms: interval, gateway_id: 'gw-1' },
  })
  await Promise.resolve()
  await Promise.resolve()
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe('GatewayClient', () => {
  it('uses the build-time Gateway host without a path', () => {
    vi.stubEnv('VITE_GATEWAY_URL', 'wss://gateway.cordis.test')
    const urls: string[] = []
    const client = new GatewayClient({
      getGatewayTicket: () => 'ticket',
      webSocketFactory: (url) => {
        urls.push(url)
        return new FakeGatewaySocket()
      },
    })

    client.connect()

    expect(urls).toEqual(['wss://gateway.cordis.test'])
    client.disconnect()
  })

  it('rejects a configured Gateway URL with a path', () => {
    vi.stubEnv('VITE_GATEWAY_URL', 'wss://gateway.cordis.test/ws')

    expect(
      () =>
        new GatewayClient({
          getGatewayTicket: () => 'ticket',
        }),
    ).toThrow('VITE_GATEWAY_URL must not include a path, query, or fragment')
  })

  it('requests a ticket while waiting for Gateway hello', async () => {
    let resolveTicket!: (ticket: string) => void
    const getGatewayTicket = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveTicket = resolve
        }),
    )
    const { client, sockets } = createHarness(getGatewayTicket)

    client.connect()
    await Promise.resolve()
    expect(getGatewayTicket).toHaveBeenCalledOnce()

    sockets[0].open()
    sockets[0].receive({
      op: GatewayOpcode.Hello,
      t: GatewayEventType.Hello,
      d: { heartbeat_interval_ms: 1_000, gateway_id: 'gw-1' },
    })
    expect(sockets[0].sent).toEqual([])

    resolveTicket('ticket')
    await vi.waitFor(() => {
      expect(sockets[0].sent[0]).toMatchObject({
        op: GatewayOpcode.Identify,
        d: { gateway_ticket: 'ticket' },
      })
    })

    client.disconnect()
  })

  it('uses the latest queued status for IDENTIFY and applies it after READY', async () => {
    const { client, sockets } = createHarness()

    client.connect()
    client.updatePresence({ status: 'dnd' })
    await receiveHello(sockets[0])

    expect(sockets[0].sent[0]).toMatchObject({
      d: { status: 'dnd' },
      op: GatewayOpcode.Identify,
    })

    sockets[0].receive({
      d: { session_id: 'session-1' },
      op: GatewayOpcode.Dispatch,
      s: 1,
      t: GatewayEventType.Ready,
    })

    expect(sockets[0].sent.at(-1)).toEqual({
      d: { status: 'dnd' },
      op: GatewayOpcode.Presence,
    })
  })

  it('sends a status update while ready', async () => {
    const { client, sockets } = createHarness()

    client.connect()
    await receiveHello(sockets[0])
    sockets[0].receive({
      d: { session_id: 'session-1' },
      op: GatewayOpcode.Dispatch,
      s: 1,
      t: GatewayEventType.Ready,
    })
    client.updatePresence({ status: 'invisible' })

    expect(sockets[0].sent.at(-1)).toEqual({
      d: { status: 'invisible' },
      op: GatewayOpcode.Presence,
    })
  })

  it('flushes a status selected after IDENTIFY when READY arrives', async () => {
    const { client, sockets } = createHarness()

    client.connect()
    await receiveHello(sockets[0])
    expect(sockets[0].sent).toHaveLength(1)

    client.updatePresence({ status: 'idle' })
    expect(sockets[0].sent).toHaveLength(1)
    sockets[0].receive({
      d: { session_id: 'session-1' },
      op: GatewayOpcode.Dispatch,
      s: 1,
      t: GatewayEventType.Ready,
    })

    expect(sockets[0].sent.at(-1)).toEqual({
      d: { status: 'idle' },
      op: GatewayOpcode.Presence,
    })
  })

  it('retries after a temporary ticket request failure', async () => {
    vi.useFakeTimers()
    const getGatewayTicket = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValue('ticket')
    const { client, sockets } = createHarness(getGatewayTicket)
    const errors = vi.fn()
    client.onError(errors)

    client.connect()
    await receiveHello(sockets[0])
    await Promise.resolve()
    await Promise.resolve()

    expect(client.state).toBe('reconnecting')
    expect(errors).toHaveBeenCalledWith(expect.objectContaining({ code: 'ticket_unavailable' }))

    await vi.advanceTimersByTimeAsync(100)
    expect(sockets).toHaveLength(2)
    await receiveHello(sockets[1])
    expect(sockets[1].sent[0]).toMatchObject({
      op: GatewayOpcode.Identify,
      d: { gateway_ticket: 'ticket' },
    })
  })

  it('ignores a ticket failure after the connection is closed', async () => {
    let rejectTicket!: (cause: unknown) => void
    const { client, sockets } = createHarness(
      () =>
        new Promise<string>((_, reject) => {
          rejectTicket = reject
        }),
    )
    const errors = vi.fn()
    client.onError(errors)

    client.connect()
    await Promise.resolve()
    sockets[0].open()
    sockets[0].receive({
      op: GatewayOpcode.Hello,
      t: GatewayEventType.Hello,
      d: { heartbeat_interval_ms: 1_000, gateway_id: 'gw-1' },
    })
    client.disconnect()
    rejectTicket(new Error('late failure'))
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    expect(client.state).toBe('idle')
    expect(errors).not.toHaveBeenCalled()
  })

  it('identifies, dispatches ready, and maintains heartbeat acknowledgements', async () => {
    vi.useFakeTimers()
    const { client, sockets } = createHarness()
    const dispatches = vi.fn()
    client.onDispatch(dispatches)

    client.connect()
    expect(client.state).toBe('connecting')
    const socket = sockets[0]
    await receiveHello(socket)

    expect(socket.sent).toEqual([
      {
        op: GatewayOpcode.Identify,
        t: GatewayEventType.Identify,
        d: {
          gateway_ticket: 'ticket',
          device_type: 'web',
          status: 'online',
          client_state: 'foreground',
        },
      },
    ])

    socket.receive({
      op: GatewayOpcode.Dispatch,
      s: 1,
      t: GatewayEventType.Ready,
      d: { session_id: 'session-1' },
    })
    expect(client.state).toBe('ready')
    expect(client.session).toEqual({ sessionId: 'session-1', sequence: 1 })
    expect(dispatches).toHaveBeenCalledWith({
      type: 'ready',
      sequence: 1,
      data: { session_id: 'session-1' },
    })

    vi.advanceTimersByTime(1_000)
    expect(socket.sent.at(-1)).toEqual({
      op: GatewayOpcode.Heartbeat,
      t: GatewayEventType.Heartbeat,
      d: 1,
    })

    socket.receive({
      op: GatewayOpcode.HeartbeatAck,
      t: GatewayEventType.HeartbeatAck,
      d: null,
    })
    vi.advanceTimersByTime(1_000)
    expect(socket.sent.at(-1)).toEqual({
      op: GatewayOpcode.Heartbeat,
      t: GatewayEventType.Heartbeat,
      d: 1,
    })
  })

  it('resumes a session after an unexpected disconnect', async () => {
    vi.useFakeTimers()
    const tickets = ['first-ticket', 'second-ticket']
    const { client, sockets } = createHarness(() => tickets.shift() ?? 'fallback-ticket')

    client.connect()
    await receiveHello(sockets[0])
    sockets[0].receive({
      op: GatewayOpcode.Dispatch,
      s: 42,
      t: GatewayEventType.Ready,
      d: { session_id: 'session-1' },
    })
    sockets[0].fail()

    expect(client.state).toBe('reconnecting')
    vi.advanceTimersByTime(100)
    expect(sockets).toHaveLength(2)
    await receiveHello(sockets[1])
    expect(sockets[1].sent).toEqual([
      {
        op: GatewayOpcode.Resume,
        t: GatewayEventType.Resume,
        d: { gateway_ticket: 'second-ticket', session_id: 'session-1', seq: 42 },
      },
    ])

    sockets[1].receive({
      op: GatewayOpcode.Dispatch,
      s: 48,
      t: GatewayEventType.Resumed,
      d: { session_id: 'session-1' },
    })
    expect(client.state).toBe('ready')
    expect(client.session).toEqual({ sessionId: 'session-1', sequence: 48 })
  })

  it('falls back to IDENTIFY when a resume is invalid', async () => {
    vi.useFakeTimers()
    const { client, sockets } = createHarness()

    client.connect()
    await receiveHello(sockets[0])
    sockets[0].receive({
      op: GatewayOpcode.Dispatch,
      s: 2,
      t: GatewayEventType.Ready,
      d: { session_id: 'session-1' },
    })
    sockets[0].fail()
    vi.advanceTimersByTime(100)
    await receiveHello(sockets[1])
    expect(sockets[1].sent[0]?.op).toBe(GatewayOpcode.Resume)

    sockets[1].receive({ op: GatewayOpcode.InvalidSession, d: false })
    vi.advanceTimersByTime(0)
    await receiveHello(sockets[2])
    expect(sockets[2].sent[0]?.op).toBe(GatewayOpcode.Identify)
  })

  it('reconnects when a heartbeat is not acknowledged', async () => {
    vi.useFakeTimers()
    const { client, sockets } = createHarness()
    const errors = vi.fn()
    client.onError(errors)

    client.connect()
    await receiveHello(sockets[0], 500)
    sockets[0].receive({
      op: GatewayOpcode.Dispatch,
      s: 1,
      t: GatewayEventType.Ready,
      d: { session_id: 'session-1' },
    })

    vi.advanceTimersByTime(500)
    expect(sockets[0].sent.at(-1)?.op).toBe(GatewayOpcode.Heartbeat)
    vi.advanceTimersByTime(500)

    expect(client.state).toBe('reconnecting')
    expect(errors.mock.calls.at(-1)?.[0]).toMatchObject({ code: 'heartbeat_timeout' })
    vi.runOnlyPendingTimers()
    expect(sockets).toHaveLength(2)
  })

  it('reconnects when a lifecycle opcode has the wrong event type', async () => {
    vi.useFakeTimers()
    const { client, sockets } = createHarness()
    const errors = vi.fn()
    client.onError(errors)

    client.connect()
    sockets[0].open()
    sockets[0].receive({
      op: GatewayOpcode.Hello,
      t: 'HELLO',
      d: { heartbeat_interval_ms: 1_000, gateway_id: 'gw-1' },
    })

    expect(client.state).toBe('reconnecting')
    expect(sockets[0].sent).toEqual([])
    expect(errors).toHaveBeenCalledWith(expect.objectContaining({ code: 'invalid_event_type' }))
    vi.runOnlyPendingTimers()
    expect(sockets).toHaveLength(2)
  })

  it('does not reconnect after an intentional disconnect', () => {
    vi.useFakeTimers()
    const { client, sockets } = createHarness()

    client.connect()
    client.disconnect()
    vi.runAllTimers()

    expect(client.state).toBe('idle')
    expect(sockets).toHaveLength(1)
  })
})
