import { describe, expect, it } from 'vitest'

import {
  GatewayEventType,
  GatewayOpcode,
  isGatewayDispatch,
  parseGatewayEnvelope,
  parseHelloData,
  type GatewayReadyData,
} from '@/gateway/protocol'

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

  it('validates hello data', () => {
    expect(parseHelloData({ heartbeat_interval_ms: 45_000, gateway_id: 'gw-1' })).toEqual({
      heartbeat_interval_ms: 45_000,
      gateway_id: 'gw-1',
    })
    expect(() => parseHelloData({ heartbeat_interval_ms: 0, gateway_id: 'gw-1' })).toThrow(
      'gateway hello payload is invalid',
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

  it('describes v0.4 lifecycle event types and embedded ready profiles', () => {
    const ready = {
      user_id: '1',
      auth_session_id: '2',
      session_id: '3',
      session_node_id: 'node-1',
      access_token_expires_at: 1_000,
      guilds: [
        {
          id: '4',
          owner_id: '1',
          name: 'Cordis',
          description: 'Community description',
          icon_asset_id: '0',
          revision: 1,
          access_revision: 1,
          created_at: 100,
          updated_at: 100,
          roles: [],
          member_role_ids: [],
          channels: [],
          permission_overwrites: [],
        },
      ],
      dm_channels: [
        {
          id: '5',
          recipient_id: '6',
          recipient: {
            user_id: '6',
            name: 'Alice',
            avatar_asset_id: '7',
            bio: '',
            created_at: 100,
            updated_at: 100,
            username: 'alice',
          },
          created_at: 100,
        },
      ],
      read_states: [],
      presences: [],
    } satisfies GatewayReadyData

    expect(GatewayEventType).toMatchObject({
      Hello: 'hello',
      Identify: 'identify',
      Resume: 'resume',
      Heartbeat: 'heartbeat',
      HeartbeatAck: 'heartbeat.ack',
    })
    expect(ready.guilds[0].description).toBe('Community description')
    expect(ready.dm_channels[0].recipient.username).toBe('alice')
  })
})
