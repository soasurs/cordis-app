import { describe, expect, it } from 'vitest'

import { GatewayOpcode, isGatewayDispatch, parseGatewayEnvelope, parseHelloData } from './protocol'

describe('gateway protocol', () => {
  it('parses a dispatch envelope', () => {
    expect(
      parseGatewayEnvelope(
        JSON.stringify({
          op: GatewayOpcode.Dispatch,
          s: 12,
          t: 'message.created',
          d: { id: '42' },
        }),
      ),
    ).toEqual({ op: GatewayOpcode.Dispatch, s: 12, t: 'message.created', d: { id: '42' } })
  })

  it('rejects invalid opcodes and sequences', () => {
    expect(() => parseGatewayEnvelope('{"op":"0"}')).toThrow('gateway envelope opcode is invalid')
    expect(() => parseGatewayEnvelope('{"op":0,"s":-1}')).toThrow(
      'gateway envelope sequence is invalid',
    )
  })

  it('validates HELLO data', () => {
    expect(parseHelloData({ heartbeat_interval_ms: 45_000, gateway_id: 'gw-1' })).toEqual({
      heartbeat_interval_ms: 45_000,
      gateway_id: 'gw-1',
    })
    expect(() => parseHelloData({ heartbeat_interval_ms: 0, gateway_id: 'gw-1' })).toThrow(
      'gateway HELLO payload is invalid',
    )
  })

  it('narrows known dispatch payloads', () => {
    const dispatch = {
      type: 'message.created',
      sequence: 1,
      data: { id: '42' },
    }

    expect(isGatewayDispatch(dispatch, 'message.created')).toBe(true)
    expect(isGatewayDispatch(dispatch, 'presence.updated')).toBe(false)
  })
})
