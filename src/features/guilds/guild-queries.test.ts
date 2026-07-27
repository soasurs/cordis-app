import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import type { GatewayReadyData } from '@/gateway'

import {
  guildChannelOverwritesQueryKey,
  guildChannelsQueryKey,
  guildInvitesInfiniteQueryOptions,
  guildMemberRolesQueryKey,
  guildMembersInfiniteQueryOptions,
  guildRolesQueryKey,
  guildsQueryKey,
  replaceGuildsFromReady,
  type GuildChannelOverwriteSummary,
  type GuildChannelSummary,
  type GuildRoleSummary,
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

describe('guildInvitesInfiniteQueryOptions', () => {
  it('continues from an opaque next cursor and stops when it is absent', () => {
    const options = guildInvitesInfiniteQueryOptions('42')

    expect(options.initialPageParam).toBeUndefined()
    expect(
      options.getNextPageParam({ invites: [], nextCursor: 'opaque-next' }, [], undefined, []),
    ).toBe('opaque-next')
    expect(options.getNextPageParam({ invites: [] }, [], undefined, [])).toBeUndefined()
  })
})

describe('replaceGuildsFromReady', () => {
  it('stores guild descriptions and member roles from the ready snapshot', () => {
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
          member_role_ids: ['51'],
          name: 'Cordis Studio',
          owner_id: '7',
          permission_overwrites: [],
          revision: 1,
          roles: [
            {
              created_at: 1_000,
              guild_id: '42',
              id: '50',
              is_default: true,
              name: 'Everyone',
              permissions: '32',
              position: 0,
              revision: 1,
              updated_at: 1_000,
            },
            {
              created_at: 1_000,
              guild_id: '42',
              id: '51',
              is_default: false,
              name: 'Helpers',
              permissions: '128',
              position: 1,
              revision: 1,
              updated_at: 1_000,
            },
          ],
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
    expect(queryClient.getQueryData<GuildRoleSummary[]>(guildRolesQueryKey('42'))).toHaveLength(2)
    expect(
      queryClient.getQueryData<GuildRoleSummary[]>(guildMemberRolesQueryKey('42', '7')),
    ).toEqual([expect.objectContaining({ id: '51', name: 'Helpers', permissions: '128' })])
  })

  it('seeds per-channel overwrites and drops orphan channel overwrite caches', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData<GuildChannelSummary[]>(guildChannelsQueryKey('42'), [
      {
        guildId: '42',
        id: '99',
        name: 'gone',
        position: 0,
        revision: 1,
        topic: '',
        type: 1,
      },
    ])
    queryClient.setQueryData<GuildChannelOverwriteSummary[]>(
      guildChannelOverwritesQueryKey('42', '99'),
      [
        {
          allow: '0',
          appliesTo: 'role',
          appliesToId: '42',
          channelId: '99',
          createdAt: 500,
          deny: '32',
          guildId: '42',
          revision: 1,
          updatedAt: 500,
        },
      ],
    )

    replaceGuildsFromReady(queryClient, {
      access_token_expires_at: 10_000,
      auth_session_id: 'auth-session',
      dm_channels: [],
      guilds: [
        {
          access_revision: 1,
          channels: [
            {
              created_at: 1_000,
              guild_id: '42',
              id: '43',
              name: 'general',
              position: 0,
              revision: 1,
              topic: '',
              type: 1,
              updated_at: 1_000,
            },
            {
              created_at: 1_000,
              guild_id: '42',
              id: '44',
              name: 'voice',
              position: 1,
              revision: 1,
              topic: '',
              type: 3,
              updated_at: 1_000,
            },
          ],
          created_at: 1_000,
          description: '',
          icon_asset_id: '0',
          id: '42',
          member_role_ids: [],
          name: 'Cordis Studio',
          owner_id: '7',
          permission_overwrites: [
            {
              allow: '32',
              applies_to: 1,
              applies_to_id: '42',
              channel_id: '43',
              created_at: 1_000,
              deny: '0',
              guild_id: '42',
              revision: 1,
              updated_at: 1_000,
            },
            {
              allow: '0',
              applies_to: 2,
              applies_to_id: '7',
              channel_id: '43',
              created_at: 2_000,
              deny: '64',
              guild_id: '42',
              revision: 2,
              updated_at: 2_000,
            },
          ],
          revision: 1,
          roles: [],
          updated_at: 1_000,
        },
      ],
      read_states: [],
      session_id: 'gateway-session',
      session_node_id: 'node-1',
      user_id: '7',
    })

    expect(queryClient.getQueryData(guildChannelOverwritesQueryKey('42', '43'))).toEqual([
      {
        allow: '32',
        appliesTo: 'role',
        appliesToId: '42',
        channelId: '43',
        createdAt: 1_000,
        deny: '0',
        guildId: '42',
        revision: 1,
        updatedAt: 1_000,
      },
      {
        allow: '0',
        appliesTo: 'member',
        appliesToId: '7',
        channelId: '43',
        createdAt: 2_000,
        deny: '64',
        guildId: '42',
        revision: 2,
        updatedAt: 2_000,
      },
    ])
    expect(queryClient.getQueryData(guildChannelOverwritesQueryKey('42', '44'))).toEqual([])
    expect(queryClient.getQueryData(guildChannelOverwritesQueryKey('42', '99'))).toBeUndefined()
  })
})
