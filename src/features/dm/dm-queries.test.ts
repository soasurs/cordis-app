import { QueryClient, type InfiniteData } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import type { DmChannelPage, DmChannelSummary } from '@/api/dm'
import {
  clearDmChannelQueries,
  dmChannelsQueryKey,
  flattenDmChannels,
  mergeDmChannelsFromReconciliation,
  patchDmChannelRecipientFromGateway,
  replaceDmChannelsFromReady,
  toDmChannelSummaryFromGateway,
  upsertDmChannelFromGateway,
} from '@/features/dm/dm-queries'

const sampleProfile = {
  avatar_asset_id: '0',
  bio: '',
  created_at: 1_000,
  name: 'Alex Chen',
  updated_at: 2_000,
  user_id: '7',
  username: 'alex_chen',
}

describe('dm query helpers', () => {
  it('replaces the DM list from the ready snapshot', () => {
    const queryClient = new QueryClient()

    replaceDmChannelsFromReady(queryClient, [
      {
        created_at: 2_000,
        id: '43',
        recipient: sampleProfile,
        recipient_id: '7',
      },
    ])

    expect(flattenDmChannels(queryClient.getQueryData(dmChannelsQueryKey))).toEqual([
      {
        channelId: '43',
        createdAt: 2_000,
        recipient: {
          avatarAssetId: '0',
          bio: '',
          createdAt: 1_000,
          name: 'Alex Chen',
          updatedAt: 2_000,
          userId: '7',
          username: 'alex_chen',
        },
      },
    ])
  })

  it('merges a complete reconciliation snapshot into the loaded DM list', () => {
    const queryClient = new QueryClient()
    seedChannels(queryClient, [
      {
        channelId: '43',
        createdAt: 1_000,
        recipient: {
          avatarAssetId: '0',
          bio: '',
          createdAt: 1_000,
          name: 'Alex Chen',
          updatedAt: 1_000,
          userId: '7',
          username: 'alex_chen',
        },
      },
    ])

    mergeDmChannelsFromReconciliation(queryClient, [
      {
        channelId: '44',
        createdAt: 2_000,
        recipient: {
          avatarAssetId: '0',
          bio: '',
          createdAt: 1_000,
          name: 'Maya',
          updatedAt: 1_000,
          userId: '8',
          username: 'maya',
        },
      },
      {
        channelId: '43',
        createdAt: 1_000,
        recipient: {
          avatarAssetId: '0',
          bio: '',
          createdAt: 1_000,
          name: 'Alex Chen',
          updatedAt: 1_000,
          userId: '7',
          username: 'alex_chen',
        },
      },
    ])

    const data = queryClient.getQueryData<InfiniteData<DmChannelPage>>(dmChannelsQueryKey)
    expect(flattenDmChannels(data).map((channel) => channel.channelId)).toEqual(['44', '43'])
    expect(data?.pages).toHaveLength(1)
    expect(data?.pages[0]?.nextCursor).toBeUndefined()
  })

  it('upserts gateway-created channels into the loaded first page', () => {
    const queryClient = new QueryClient()
    seedChannels(queryClient, [
      {
        channelId: '43',
        createdAt: 1_000,
        recipient: {
          avatarAssetId: '0',
          bio: '',
          createdAt: 1_000,
          name: 'Maya',
          updatedAt: 1_000,
          userId: '8',
          username: 'maya',
        },
      },
    ])

    upsertDmChannelFromGateway(queryClient, {
      channel_id: '44',
      created_at: 2_000,
      recipient: sampleProfile,
      recipient_id: '7',
      user_id: '8',
    })

    expect(
      flattenDmChannels(queryClient.getQueryData(dmChannelsQueryKey)).map((item) => item.channelId),
    ).toEqual(['44', '43'])
  })

  it('replaces an existing channel instead of duplicating it', () => {
    const queryClient = new QueryClient()
    const existing: DmChannelSummary = {
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
    }
    seedChannels(queryClient, [existing])

    upsertDmChannelFromGateway(queryClient, {
      channel_id: '43',
      created_at: 2_000,
      recipient: sampleProfile,
      recipient_id: '7',
      user_id: '8',
    })

    const channels = flattenDmChannels(queryClient.getQueryData(dmChannelsQueryKey))
    expect(channels).toHaveLength(1)
    expect(channels[0]?.recipient.name).toBe('Alex Chen')
  })

  it('deduplicates an upserted channel across loaded pages', () => {
    const queryClient = new QueryClient()
    const existing: DmChannelSummary = {
      channelId: '43',
      createdAt: 1_000,
      recipient: {
        avatarAssetId: '0',
        bio: '',
        createdAt: 1_000,
        name: 'Alex Chen',
        updatedAt: 1_000,
        userId: '7',
        username: 'alex_chen',
      },
    }
    queryClient.setQueryData<InfiniteData<DmChannelPage>>(dmChannelsQueryKey, {
      pageParams: [undefined, 'older'],
      pages: [
        { channels: [], nextCursor: 'older' },
        { channels: [existing], nextCursor: undefined },
      ],
    })

    upsertDmChannelFromGateway(queryClient, {
      channel_id: '43',
      created_at: 2_000,
      recipient: sampleProfile,
      recipient_id: '7',
      user_id: '8',
    })

    const data = queryClient.getQueryData<InfiniteData<DmChannelPage>>(dmChannelsQueryKey)
    expect(data?.pages[0]?.channels.map((item) => item.channelId)).toEqual(['43'])
    expect(data?.pages[1]?.channels).toEqual([])
  })

  it('patches recipient profiles from gateway profile updates', () => {
    const queryClient = new QueryClient()
    seedChannels(queryClient, [
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
    ])

    patchDmChannelRecipientFromGateway(queryClient, {
      ...sampleProfile,
      name: 'Alex Chen Updated',
      updated_at: 3_000,
    })

    expect(flattenDmChannels(queryClient.getQueryData(dmChannelsQueryKey))[0]?.recipient.name).toBe(
      'Alex Chen Updated',
    )

    // Stale profile payloads must not regress the cache.
    patchDmChannelRecipientFromGateway(queryClient, {
      ...sampleProfile,
      name: 'Stale',
      updated_at: 500,
    })
    expect(flattenDmChannels(queryClient.getQueryData(dmChannelsQueryKey))[0]?.recipient.name).toBe(
      'Alex Chen Updated',
    )
  })

  it('does not synthesize a cache when the DM list has not loaded', () => {
    const queryClient = new QueryClient()

    upsertDmChannelFromGateway(queryClient, {
      channel_id: '44',
      created_at: 2_000,
      recipient: sampleProfile,
      recipient_id: '7',
      user_id: '8',
    })

    expect(queryClient.getQueryData(dmChannelsQueryKey)).toBeUndefined()
  })

  it('clears DM list queries on logout', () => {
    const queryClient = new QueryClient()
    seedChannels(queryClient, [
      {
        channelId: '43',
        createdAt: 1_000,
        recipient: {
          avatarAssetId: '0',
          bio: '',
          createdAt: 1_000,
          name: 'Maya',
          updatedAt: 1_000,
          userId: '8',
          username: 'maya',
        },
      },
    ])

    clearDmChannelQueries(queryClient)

    expect(queryClient.getQueryData(dmChannelsQueryKey)).toBeUndefined()
  })

  it('maps gateway payloads to the application summary shape', () => {
    expect(
      toDmChannelSummaryFromGateway({
        channel_id: '43',
        created_at: 2_000,
        recipient: sampleProfile,
        recipient_id: '7',
        user_id: '8',
      }),
    ).toEqual({
      channelId: '43',
      createdAt: 2_000,
      recipient: {
        avatarAssetId: '0',
        bio: '',
        createdAt: 1_000,
        name: 'Alex Chen',
        updatedAt: 2_000,
        userId: '7',
        username: 'alex_chen',
      },
    })
  })
})

function seedChannels(queryClient: QueryClient, channels: DmChannelSummary[]) {
  queryClient.setQueryData<InfiniteData<DmChannelPage>>(dmChannelsQueryKey, {
    pageParams: [undefined],
    pages: [{ channels, nextCursor: undefined }],
  })
}
