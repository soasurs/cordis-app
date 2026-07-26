import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import { syncGatewayDispatch } from '@/app/gateway-query-sync'
import {
  guildChannelOverwritesQueryKey,
  guildChannelsQueryKey,
} from '@/features/guilds/guild-queries'

describe('syncGatewayDispatch channel overwrites', () => {
  it('invalidates channel list and overwrites on overwrite events', () => {
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

    expect(invalidateQueries).toHaveBeenCalledWith({
      exact: true,
      queryKey: guildChannelsQueryKey('42'),
      refetchType: 'all',
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: guildChannelOverwritesQueryKey('42', '43'),
    })
  })

  it('invalidates channel list on session reconcile', () => {
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
  })
})
