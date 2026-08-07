import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import { clearGatewayQueries, syncGatewayDispatch } from '@/app/gateway-query-sync'
import { gatewayReadyQueryKey } from '@/app/gateway-context'
import { dmChannelsQueryKey, flattenDmChannels } from '@/features/dm/dm-queries'
import {
  guildChannelOverwritesQueryKey,
  guildChannelLayoutRevisionQueryKey,
  guildChannelsQueryKey,
  guildRolesQueryKey,
  type GuildChannelOverwriteSummary,
  type GuildChannelSummary,
  type GuildRoleSummary,
} from '@/features/guilds/guild-queries'
import { channelMessagesQueryKey } from '@/features/messages/message-queries'
import {
  channelReadStatesQueryKey,
  mergeChannelReadStates,
  type ChannelReadStatesMap,
} from '@/features/messages/read-state-queries'

describe('syncGatewayDispatch channel overwrites', () => {
  it('patches overwrite cache and invalidates channel list when View Channel changes', () => {
    const queryClient = new QueryClient()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    queryClient.setQueryData<GuildChannelOverwriteSummary[]>(
      guildChannelOverwritesQueryKey('42', '43'),
      [
        {
          allow: '0',
          appliesTo: 'role',
          appliesToId: '42',
          channelId: '43',
          createdAt: 1_000,
          deny: '0',
          guildId: '42',
          revision: 1,
          updatedAt: 1_000,
        },
      ],
    )

    syncGatewayDispatch(queryClient, {
      type: 'guild.channel.overwrite.updated',
      sequence: 1,
      data: {
        allow: '32',
        applies_to: 1,
        applies_to_id: '42',
        channel_id: '43',
        deny: '0',
        guild_id: '42',
        revision: 2,
        updated_at: 3_000,
      },
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
        revision: 2,
        updatedAt: 3_000,
      },
    ])
    expect(invalidateQueries).toHaveBeenCalledWith({
      exact: true,
      queryKey: guildChannelsQueryKey('42'),
      refetchType: 'all',
    })
    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: guildChannelOverwritesQueryKey('42', '43'),
    })
  })

  it('does not invalidate channel list when overwrite update ignores View Channel', () => {
    const queryClient = new QueryClient()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    queryClient.setQueryData<GuildChannelOverwriteSummary[]>(
      guildChannelOverwritesQueryKey('42', '43'),
      [
        {
          allow: '0',
          appliesTo: 'role',
          appliesToId: '42',
          channelId: '43',
          createdAt: 1_000,
          deny: '0',
          guildId: '42',
          revision: 1,
          updatedAt: 1_000,
        },
      ],
    )

    syncGatewayDispatch(queryClient, {
      type: 'guild.channel.overwrite.updated',
      sequence: 1,
      data: {
        allow: '64',
        applies_to: 1,
        applies_to_id: '42',
        channel_id: '43',
        deny: '0',
        guild_id: '42',
        revision: 2,
        updated_at: 3_000,
      },
    })

    expect(queryClient.getQueryData(guildChannelOverwritesQueryKey('42', '43'))).toEqual([
      expect.objectContaining({ allow: '64', deny: '0', revision: 2 }),
    ])
    expect(invalidateQueries).not.toHaveBeenCalled()
  })

  it('does not synthesize overwrite cache when update arrives before seed', () => {
    const queryClient = new QueryClient()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    syncGatewayDispatch(queryClient, {
      type: 'guild.channel.overwrite.updated',
      sequence: 1,
      data: {
        allow: '32',
        applies_to: 1,
        applies_to_id: '42',
        channel_id: '43',
        deny: '0',
        guild_id: '42',
        revision: 2,
        updated_at: 3_000,
      },
    })

    expect(queryClient.getQueryData(guildChannelOverwritesQueryKey('42', '43'))).toBeUndefined()
    // Cold overwrite cache: refresh channels because previous View Channel state is unknown.
    expect(invalidateQueries).toHaveBeenCalledWith({
      exact: true,
      queryKey: guildChannelsQueryKey('42'),
      refetchType: 'all',
    })
  })

  it('removes overwrite cache entries and invalidates channel list when View Channel overwrite is deleted', () => {
    const queryClient = new QueryClient()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    queryClient.setQueryData<GuildChannelOverwriteSummary[]>(
      guildChannelOverwritesQueryKey('42', '43'),
      [
        {
          allow: '32',
          appliesTo: 'role',
          appliesToId: '42',
          channelId: '43',
          createdAt: 1_000,
          deny: '0',
          guildId: '42',
          revision: 2,
          updatedAt: 1_000,
        },
        {
          allow: '0',
          appliesTo: 'member',
          appliesToId: '7',
          channelId: '43',
          createdAt: 1_000,
          deny: '64',
          guildId: '42',
          revision: 1,
          updatedAt: 1_000,
        },
      ],
    )

    syncGatewayDispatch(queryClient, {
      type: 'guild.channel.overwrite.deleted',
      sequence: 2,
      data: {
        applies_to: 1,
        applies_to_id: '42',
        channel_id: '43',
        guild_id: '42',
      },
    })

    expect(queryClient.getQueryData(guildChannelOverwritesQueryKey('42', '43'))).toEqual([
      {
        allow: '0',
        appliesTo: 'member',
        appliesToId: '7',
        channelId: '43',
        createdAt: 1_000,
        deny: '64',
        guildId: '42',
        revision: 1,
        updatedAt: 1_000,
      },
    ])
    expect(invalidateQueries).toHaveBeenCalledWith({
      exact: true,
      queryKey: guildChannelsQueryKey('42'),
      refetchType: 'all',
    })
  })

  it('does not invalidate channel list when deleted overwrite ignored View Channel', () => {
    const queryClient = new QueryClient()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    queryClient.setQueryData<GuildChannelOverwriteSummary[]>(
      guildChannelOverwritesQueryKey('42', '43'),
      [
        {
          allow: '64',
          appliesTo: 'role',
          appliesToId: '42',
          channelId: '43',
          createdAt: 1_000,
          deny: '0',
          guildId: '42',
          revision: 1,
          updatedAt: 1_000,
        },
      ],
    )

    syncGatewayDispatch(queryClient, {
      type: 'guild.channel.overwrite.deleted',
      sequence: 2,
      data: {
        applies_to: 1,
        applies_to_id: '42',
        channel_id: '43',
        guild_id: '42',
      },
    })

    expect(queryClient.getQueryData(guildChannelOverwritesQueryKey('42', '43'))).toEqual([])
    expect(invalidateQueries).not.toHaveBeenCalled()
  })

  it('does not synthesize empty overwrite cache when delete arrives before seed', () => {
    const queryClient = new QueryClient()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    syncGatewayDispatch(queryClient, {
      type: 'guild.channel.overwrite.deleted',
      sequence: 2,
      data: {
        applies_to: 1,
        applies_to_id: '42',
        channel_id: '43',
        guild_id: '42',
      },
    })

    expect(queryClient.getQueryData(guildChannelOverwritesQueryKey('42', '43'))).toBeUndefined()
    expect(invalidateQueries).toHaveBeenCalledWith({
      exact: true,
      queryKey: guildChannelsQueryKey('42'),
      refetchType: 'all',
    })
  })

  it('seeds empty overwrite cache on channel create so later overwrite events can patch', () => {
    const queryClient = new QueryClient()

    syncGatewayDispatch(queryClient, {
      type: 'guild.channel.created',
      sequence: 1,
      data: {
        created_at: 1_000,
        guild_id: '42',
        id: '43',
        name: 'general',
        parent_id: '0',
        position: 0,
        revision: 1,
        topic: '',
        type: 1,
        updated_at: 1_000,
      },
    })

    expect(queryClient.getQueryData(guildChannelOverwritesQueryKey('42', '43'))).toEqual([])

    syncGatewayDispatch(queryClient, {
      type: 'guild.channel.overwrite.updated',
      sequence: 2,
      data: {
        allow: '32',
        applies_to: 1,
        applies_to_id: '42',
        channel_id: '43',
        deny: '0',
        guild_id: '42',
        revision: 1,
        updated_at: 2_000,
      },
    })

    expect(queryClient.getQueryData(guildChannelOverwritesQueryKey('42', '43'))).toEqual([
      {
        allow: '32',
        appliesTo: 'role',
        appliesToId: '42',
        channelId: '43',
        createdAt: 2_000,
        deny: '0',
        guildId: '42',
        revision: 1,
        updatedAt: 2_000,
      },
    ])
  })

  it('invalidates channel list and overwrites on session reconcile', () => {
    const queryClient = new QueryClient()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    syncGatewayDispatch(queryClient, {
      type: 'session.reconcile',
      sequence: 2,
      data: {
        channel_id: '43',
        guild_id: '42',
      },
    })

    expect(invalidateQueries).toHaveBeenCalledWith({
      exact: true,
      queryKey: guildChannelsQueryKey('42'),
      refetchType: 'all',
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: guildChannelOverwritesQueryKey('42', '43'),
    })
  })
})

describe('syncGatewayDispatch channel layout revisions', () => {
  it('ignores stale structural events and preserves the newest layout token', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData<GuildChannelSummary[]>(guildChannelsQueryKey('42'), [
      {
        guildId: '42',
        id: '43',
        name: 'general',
        position: 0,
        revision: 1,
        topic: '',
        type: 1,
      },
    ])
    queryClient.setQueryData(guildChannelLayoutRevisionQueryKey('42'), 5)

    syncGatewayDispatch(queryClient, {
      type: 'guild.channel.updated',
      sequence: 1,
      data: {
        channel_layout_revision: 4,
        created_at: 1_000,
        guild_id: '42',
        id: '43',
        name: 'stale',
        parent_id: '0',
        position: 0,
        revision: 2,
        topic: '',
        type: 1,
        updated_at: 2_000,
      },
    })

    expect(queryClient.getQueryData<GuildChannelSummary[]>(guildChannelsQueryKey('42'))).toEqual([
      expect.objectContaining({ id: '43', name: 'general', revision: 1 }),
    ])
    expect(queryClient.getQueryData(guildChannelLayoutRevisionQueryKey('42'))).toBe(5)
  })

  it('applies metadata events without dropping the cached layout token', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData<GuildChannelSummary[]>(guildChannelsQueryKey('42'), [
      {
        guildId: '42',
        id: '43',
        name: 'general',
        position: 0,
        revision: 1,
        topic: '',
        type: 1,
      },
    ])
    queryClient.setQueryData(guildChannelLayoutRevisionQueryKey('42'), 5)

    syncGatewayDispatch(queryClient, {
      type: 'guild.channel.updated',
      sequence: 1,
      data: {
        created_at: 1_000,
        guild_id: '42',
        id: '43',
        name: 'renamed',
        parent_id: '0',
        position: 0,
        revision: 2,
        topic: '',
        type: 1,
        updated_at: 2_000,
      },
    })

    expect(queryClient.getQueryData<GuildChannelSummary[]>(guildChannelsQueryKey('42'))).toEqual([
      expect.objectContaining({ id: '43', name: 'renamed', revision: 2 }),
    ])
    expect(queryClient.getQueryData(guildChannelLayoutRevisionQueryKey('42'))).toBe(5)
  })

  it('refreshes an unseeded channel cache when a delete event has no layout token', () => {
    const queryClient = new QueryClient()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    syncGatewayDispatch(queryClient, {
      type: 'guild.channel.deleted',
      sequence: 1,
      data: {
        deleted_at: 2_000,
        guild_id: '42',
        id: '43',
        revision: 2,
      },
    })

    expect(invalidateQueries).toHaveBeenCalledWith({
      exact: true,
      queryKey: guildChannelsQueryKey('42'),
      refetchType: 'all',
    })
  })
})

describe('syncGatewayDispatch role visibility refresh', () => {
  it('invalidates channel list only when role View Channel or Administrator changes', () => {
    const queryClient = new QueryClient()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    queryClient.setQueryData<GuildRoleSummary[]>(guildRolesQueryKey('42'), [
      {
        createdAt: 1_000,
        guildId: '42',
        id: '51',
        isDefault: false,
        name: 'Helpers',
        permissions: '64',
        position: 1,
        revision: 1,
        updatedAt: 1_000,
      },
    ])

    syncGatewayDispatch(queryClient, {
      type: 'guild.role.updated',
      sequence: 1,
      data: {
        created_at: 1_000,
        guild_id: '42',
        id: '51',
        is_default: false,
        name: 'Helpers',
        permissions: '192',
        position: 1,
        revision: 2,
        updated_at: 2_000,
      },
    })

    expect(invalidateQueries).not.toHaveBeenCalled()

    syncGatewayDispatch(queryClient, {
      type: 'guild.role.updated',
      sequence: 2,
      data: {
        created_at: 1_000,
        guild_id: '42',
        id: '51',
        is_default: false,
        name: 'Helpers',
        permissions: '224',
        position: 1,
        revision: 3,
        updated_at: 3_000,
      },
    })

    expect(invalidateQueries).toHaveBeenCalledWith({
      exact: true,
      queryKey: guildChannelsQueryKey('42'),
      refetchType: 'all',
    })
  })

  it('does not invalidate channel list when a role is created', () => {
    const queryClient = new QueryClient()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    syncGatewayDispatch(queryClient, {
      type: 'guild.role.created',
      sequence: 1,
      data: {
        created_at: 1_000,
        guild_id: '42',
        id: '51',
        is_default: false,
        name: 'Helpers',
        permissions: '32',
        position: 1,
        revision: 1,
        updated_at: 1_000,
      },
    })

    expect(invalidateQueries).not.toHaveBeenCalled()
  })
})

describe('syncGatewayDispatch messages', () => {
  it('upserts and removes messages in a warm channel cache', async () => {
    const { channelMessagesQueryKey } = await import('@/features/messages/message-queries')
    const queryClient = new QueryClient()
    queryClient.setQueryData(channelMessagesQueryKey('43'), {
      pageParams: [undefined],
      pages: [
        {
          messages: [
            {
              channelId: '43',
              content: 'Earlier',
              createdAt: 1_500,
              editedAt: 0,
              flags: 0,
              id: '101',
              revision: 1,
              type: 1,
              updatedAt: 1_500,
            },
          ],
        },
      ],
    })

    syncGatewayDispatch(queryClient, {
      type: 'message.created',
      sequence: 1,
      data: {
        attachments: [],
        author: {
          avatar_asset_id: '0',
          created_at: 1_000,
          name: 'Alex',
          updated_at: 1_000,
          user_id: '7',
          username: 'alex',
        },
        channel_id: '43',
        content: 'Hello',
        created_at: 2_000,
        edited_at: 0,
        flags: 0,
        id: '102',
        mention_user_ids: [],
        revision: 1,
        type: 1,
        updated_at: 2_000,
      },
    })

    const afterCreate = queryClient.getQueryData<{
      pages: Array<{ messages: Array<{ id: string; content: string }> }>
    }>(channelMessagesQueryKey('43'))
    expect(afterCreate?.pages[0]?.messages.map((item) => item.id)).toEqual(['102', '101'])

    syncGatewayDispatch(queryClient, {
      type: 'message.updated',
      sequence: 2,
      data: {
        attachments: [],
        author: {
          avatar_asset_id: '0',
          created_at: 1_000,
          name: 'Alex',
          updated_at: 1_000,
          user_id: '7',
          username: 'alex',
        },
        channel_id: '43',
        content: 'Hello edited',
        created_at: 2_000,
        edited_at: 3_000,
        flags: 0,
        id: '102',
        mention_user_ids: [],
        revision: 2,
        type: 1,
        updated_at: 3_000,
      },
    })

    const afterUpdate = queryClient.getQueryData<{
      pages: Array<{ messages: Array<{ id: string; content: string }> }>
    }>(channelMessagesQueryKey('43'))
    expect(afterUpdate?.pages[0]?.messages[0]?.content).toBe('Hello edited')

    syncGatewayDispatch(queryClient, {
      type: 'message.updated',
      sequence: 3,
      data: {
        attachments: [],
        author: {
          avatar_asset_id: '0',
          created_at: 1_000,
          name: 'Alex',
          updated_at: 1_000,
          user_id: '7',
          username: 'alex',
        },
        channel_id: '43',
        content: 'Ghost edit',
        created_at: 4_000,
        edited_at: 4_000,
        flags: 0,
        id: '999',
        mention_user_ids: [],
        revision: 1,
        type: 1,
        updated_at: 4_000,
      },
    })

    expect(
      queryClient
        .getQueryData<{ pages: Array<{ messages: Array<{ id: string }> }> }>(
          channelMessagesQueryKey('43'),
        )
        ?.pages[0]?.messages.map((item) => item.id),
    ).toEqual(['102', '101'])

    syncGatewayDispatch(queryClient, {
      type: 'message.deleted',
      sequence: 4,
      data: {
        channel_id: '43',
        deleted_at: 4_000,
        id: '102',
        last_message_id: '101',
        mention_user_ids: [],
        revision: 2,
      },
    })

    const afterDelete = queryClient.getQueryData<{
      pages: Array<{ messages: Array<{ id: string }> }>
    }>(channelMessagesQueryKey('43'))
    expect(afterDelete?.pages[0]?.messages.map((item) => item.id)).toEqual(['101'])
  })

  it('increments the mention count for direct, role, and everyone mentions', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(gatewayReadyQueryKey, {
      guilds: [{ id: '42', member_role_ids: ['50'] }],
      user_id: '7',
    })
    queryClient.setQueryData<ChannelReadStatesMap>(channelReadStatesQueryKey(), {
      '43': {
        channelId: '43',
        lastMessageId: '100',
        lastReadMessageId: '100',
        mentionCount: 0,
      },
    })

    syncGatewayDispatch(queryClient, {
      type: 'message.created',
      sequence: 1,
      data: {
        attachments: [],
        author: {
          avatar_asset_id: '0',
          created_at: 1_000,
          name: 'Alex',
          updated_at: 1_000,
          user_id: '8',
          username: 'alex',
        },
        channel_id: '43',
        content: 'Hello @me',
        created_at: 2_000,
        edited_at: 0,
        flags: 0,
        id: '101',
        mention_user_ids: ['7'],
        revision: 1,
        type: 1,
        updated_at: 2_000,
      },
    })

    expect(
      queryClient.getQueryData<ChannelReadStatesMap>(channelReadStatesQueryKey())?.['43'],
    ).toEqual({
      channelId: '43',
      lastMessageId: '101',
      lastReadMessageId: '100',
      mentionCount: 1,
    })

    syncGatewayDispatch(queryClient, {
      type: 'message.created',
      sequence: 2,
      data: {
        attachments: [],
        author: {
          avatar_asset_id: '0',
          created_at: 1_000,
          name: 'Alex',
          updated_at: 1_000,
          user_id: '8',
          username: 'alex',
        },
        channel_id: '43',
        content: 'Hello @role',
        created_at: 3_000,
        edited_at: 0,
        flags: 0,
        guild_id: '42',
        id: '102',
        mention_role_ids: ['50'],
        mention_user_ids: null,
        revision: 1,
        type: 1,
        updated_at: 3_000,
      },
    })

    syncGatewayDispatch(queryClient, {
      type: 'message.created',
      sequence: 3,
      data: {
        attachments: [],
        author: {
          avatar_asset_id: '0',
          created_at: 1_000,
          name: 'Alex',
          updated_at: 1_000,
          user_id: '8',
          username: 'alex',
        },
        channel_id: '43',
        content: 'Hello everyone',
        created_at: 4_000,
        edited_at: 0,
        flags: 0,
        guild_id: '42',
        id: '103',
        mention_everyone: true,
        mention_role_ids: null,
        mention_user_ids: null,
        revision: 1,
        type: 1,
        updated_at: 4_000,
      },
    })

    expect(
      queryClient.getQueryData<ChannelReadStatesMap>(channelReadStatesQueryKey())?.['43']
        ?.mentionCount,
    ).toBe(3)

    mergeChannelReadStates(queryClient, [
      {
        channelId: '43',
        lastMessageId: '103',
        lastReadMessageId: '100',
        mentionCount: 0,
      },
    ])
    expect(
      queryClient.getQueryData<ChannelReadStatesMap>(channelReadStatesQueryKey())?.['43']
        ?.mentionCount,
    ).toBe(3)
  })

  it('increments the mention count for replies to the current user', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(gatewayReadyQueryKey, {
      guilds: [],
      user_id: '7',
    })
    queryClient.setQueryData<ChannelReadStatesMap>(channelReadStatesQueryKey(), {
      '43': {
        channelId: '43',
        lastMessageId: '100',
        lastReadMessageId: '100',
        mentionCount: 0,
      },
    })
    queryClient.setQueryData(channelMessagesQueryKey('43'), {
      pageParams: [undefined],
      pages: [
        {
          messages: [
            {
              author: { userId: '7' },
              channelId: '43',
              id: '50',
            },
          ],
        },
      ],
    })

    syncGatewayDispatch(queryClient, {
      type: 'message.created',
      sequence: 1,
      data: {
        attachments: [],
        author: {
          avatar_asset_id: '0',
          created_at: 1_000,
          name: 'Alex',
          updated_at: 1_000,
          user_id: '8',
          username: 'alex',
        },
        channel_id: '43',
        content: 'Replying to you',
        created_at: 2_000,
        edited_at: 0,
        flags: 0,
        id: '101',
        mention_user_ids: [],
        referenced_channel_id: '43',
        referenced_message_id: '50',
        revision: 1,
        type: 19,
        updated_at: 2_000,
      },
    })

    expect(
      queryClient.getQueryData<ChannelReadStatesMap>(channelReadStatesQueryKey())?.['43'],
    ).toEqual({
      channelId: '43',
      lastMessageId: '101',
      lastReadMessageId: '100',
      mentionCount: 1,
    })
  })
})

describe('syncGatewayDispatch DM channels', () => {
  it('seeds the DM list from the ready snapshot', () => {
    const queryClient = new QueryClient()

    syncGatewayDispatch(queryClient, {
      type: 'ready',
      sequence: 1,
      data: {
        access_token_expires_at: 9_000,
        auth_session_id: 'auth',
        dm_channels: [
          {
            created_at: 2_000,
            id: '43',
            recipient: {
              avatar_asset_id: '0',
              bio: '',
              created_at: 1_000,
              name: 'Alex Chen',
              updated_at: 2_000,
              user_id: '7',
              username: 'alex_chen',
            },
            recipient_id: '7',
          },
        ],
        guilds: [],
        presence_preference: { status: 'online', version: '1' },
        presences: [],
        read_states: [],
        session_id: 'session',
        session_node_id: 'node',
        user_id: '8',
      },
    })

    expect(flattenDmChannels(queryClient.getQueryData(dmChannelsQueryKey))).toEqual([
      expect.objectContaining({ channelId: '43' }),
    ])
  })

  it('upserts a DM channel created while the list is loaded', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(dmChannelsQueryKey, {
      pageParams: [undefined],
      pages: [{ channels: [], nextCursor: undefined }],
    })

    syncGatewayDispatch(queryClient, {
      type: 'dm.channel.created',
      sequence: 2,
      data: {
        channel_id: '44',
        created_at: 3_000,
        recipient: {
          avatar_asset_id: '0',
          bio: '',
          created_at: 1_000,
          name: 'Maya',
          updated_at: 1_000,
          user_id: '9',
          username: 'maya',
        },
        recipient_id: '9',
        user_id: '8',
      },
    })

    expect(
      flattenDmChannels(queryClient.getQueryData(dmChannelsQueryKey)).map((item) => item.channelId),
    ).toEqual(['44'])
  })

  it('clears DM queries with the rest of the gateway cache', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(dmChannelsQueryKey, {
      pageParams: [undefined],
      pages: [{ channels: [], nextCursor: undefined }],
    })

    clearGatewayQueries(queryClient)

    expect(queryClient.getQueryData(dmChannelsQueryKey)).toBeUndefined()
  })

  it('patches DM recipient profiles on user profile updates', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(dmChannelsQueryKey, {
      pageParams: [undefined],
      pages: [
        {
          channels: [
            {
              channelId: '43',
              createdAt: 1_000,
              recipient: {
                avatarAssetId: '0',
                bio: '',
                createdAt: 1_000,
                name: 'Old name',
                updatedAt: 1_000,
                userId: '7',
                username: 'alex_chen',
              },
            },
          ],
          nextCursor: undefined,
        },
      ],
    })

    syncGatewayDispatch(queryClient, {
      type: 'user.profile.updated',
      sequence: 3,
      data: {
        avatar_asset_id: '0',
        bio: '',
        created_at: 1_000,
        name: 'Alex Chen Updated',
        updated_at: 3_000,
        user_id: '7',
        username: 'alex_chen',
      },
    })

    expect(flattenDmChannels(queryClient.getQueryData(dmChannelsQueryKey))[0]?.recipient.name).toBe(
      'Alex Chen Updated',
    )
  })
})
