import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import type { GatewayReadyData } from '@/gateway'

import {
  guildMembersInfiniteQueryOptions,
  guildsQueryKey,
  replaceGuildsFromReady,
  type GuildSummary,
} from '@/features/guilds/guild-queries'

describe('guildMembersInfiniteQueryOptions', () => {
  it('continues from an opaque next cursor and stops when it is absent', () => {
    const options = guildMembersInfiniteQueryOptions('42')

    expect(options.initialPageParam).toBeUndefined()
    expect(
      options.getNextPageParam({ members: [], nextCursor: 'opaque-next' }, [], undefined, []),
    ).toBe('opaque-next')
    expect(options.getNextPageParam({ members: [] }, [], undefined, [])).toBeUndefined()
  })
})

describe('replaceGuildsFromReady', () => {
  it('stores guild descriptions from the ready snapshot', () => {
    const queryClient = new QueryClient()
    const ready = {
      access_token_expires_at: 10_000,
      auth_session_id: 'auth-session',
      dm_channels: [],
      guilds: [
        {
          access_revision: 1,
          channels: [],
          created_at: 1_000,
          description: 'Community description',
          icon_asset_id: '0',
          id: '42',
          member_role_ids: [],
          name: 'Cordis Studio',
          owner_id: '7',
          permission_overwrites: [],
          revision: 1,
          roles: [],
          updated_at: 1_000,
        },
      ],
      read_states: [],
      session_id: 'gateway-session',
      session_node_id: 'node-1',
      user_id: '7',
    } satisfies GatewayReadyData

    replaceGuildsFromReady(queryClient, ready)

    expect(queryClient.getQueryData<GuildSummary[]>(guildsQueryKey)?.[0]).toEqual({
      createdAt: 1_000,
      description: 'Community description',
      iconAssetId: '0',
      id: '42',
      name: 'Cordis Studio',
      ownerId: '7',
      revision: 1,
      updatedAt: 1_000,
    })
  })
})
