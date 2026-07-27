import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import { syncGatewayDispatch } from '@/app/gateway-query-sync'
import {
  guildChannelOverwritesQueryKey,
  guildChannelsQueryKey,
  type GuildChannelOverwriteSummary,
} from '@/features/guilds/guild-queries'

describe('syncGatewayDispatch channel overwrites', () => {
  it('patches overwrite cache and invalidates channel list on update', () => {
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

  it('does not synthesize overwrite cache when update arrives before seed', () => {
    const queryClient = new QueryClient()

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
  })

  it('removes overwrite cache entries and invalidates channel list on delete', () => {
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
          updatedAt: 3_000,
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

  it('does not synthesize empty overwrite cache when delete arrives before seed', () => {
    const queryClient = new QueryClient()

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
