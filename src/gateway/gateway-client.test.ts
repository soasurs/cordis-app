import { afterEach, describe, expect, it, vi } from 'vitest'

import { GatewayClient, type GatewaySocket } from './gateway-client'
import { GatewayOpcode, type GatewayEnvelope } from './protocol'

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

function createHarness(
  getAccessToken: () => string | null | Promise<string | null> = () => 'token',
) {
  const sockets: FakeGatewaySocket[] = []
  const client = new GatewayClient({
    url: 'ws://cordis.test',
    getAccessToken,
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
    t: 'hello',
    d: { heartbeat_interval_ms: interval, gateway_id: 'gw-1' },
  })
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
      getAccessToken: () => 'token',
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
          getAccessToken: () => 'token',
        }),
    ).toThrow('VITE_GATEWAY_URL must not include a path, query, or fragment')
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
        d: {
          token: 'token',
          device_type: 'web',
          status: 'online',
          client_state: 'foreground',
        },
      },
    ])

    socket.receive({
      op: GatewayOpcode.Dispatch,
      s: 1,
      t: 'ready',
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
    expect(socket.sent.at(-1)).toEqual({ op: GatewayOpcode.Heartbeat, d: 1 })

    socket.receive({ op: GatewayOpcode.HeartbeatAck, t: 'heartbeat.ack', d: null })
    vi.advanceTimersByTime(1_000)
    expect(socket.sent.at(-1)).toEqual({ op: GatewayOpcode.Heartbeat, d: 1 })
  })

  it('resumes a session after an unexpected disconnect', async () => {
    vi.useFakeTimers()
    const tokens = ['first-token', 'refreshed-token']
    const { client, sockets } = createHarness(() => tokens.shift() ?? null)

    client.connect()
    await receiveHello(sockets[0])
    sockets[0].receive({
      op: GatewayOpcode.Dispatch,
      s: 42,
      t: 'ready',
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
        d: { token: 'refreshed-token', session_id: 'session-1', seq: 42 },
      },
    ])

    sockets[1].receive({
      op: GatewayOpcode.Dispatch,
      s: 48,
      t: 'resumed',
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
      t: 'ready',
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
      t: 'ready',
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
