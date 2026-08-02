import { infiniteQueryOptions, type InfiniteData, type QueryClient } from '@tanstack/react-query'

import { listDmChannels, type DmChannelPage, type DmChannelSummary } from '@/api/dm'
import type { PublicUserProfile } from '@/api/user'
import type { DmChannelCreatedPayload, ReadyDmChannel, UserProfilePayload } from '@/gateway'

export const dmChannelsQueryKey = ['dm-channels'] as const

export function dmChannelsInfiniteQueryOptions() {
  return infiniteQueryOptions<
    DmChannelPage,
    Error,
    InfiniteData<DmChannelPage>,
    typeof dmChannelsQueryKey,
    string | undefined
  >({
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listDmChannels(pageParam),
    queryKey: dmChannelsQueryKey,
    staleTime: 30_000,
  })
}

export function flattenDmChannels(data: InfiniteData<DmChannelPage> | undefined) {
  return data?.pages.flatMap((page) => page.channels) ?? []
}

/** Seed the DM list from the READY snapshot; the server list remains the source of truth. */
export function replaceDmChannelsFromReady(queryClient: QueryClient, channels: ReadyDmChannel[]) {
  queryClient.setQueryData<InfiniteData<DmChannelPage>>(dmChannelsQueryKey, {
    pageParams: [undefined],
    pages: [
      {
        channels: channels.map(toDmChannelSummaryFromReady),
        nextCursor: undefined,
      },
    ],
  })
}

export function upsertDmChannelFromApi(queryClient: QueryClient, channel: DmChannelSummary) {
  patchDmChannelPages(queryClient, (pages) => upsertDmChannelPages(pages, channel))
}

export function upsertDmChannelFromGateway(
  queryClient: QueryClient,
  payload: DmChannelCreatedPayload,
) {
  upsertDmChannelFromApi(queryClient, toDmChannelSummaryFromGateway(payload))
}

export function patchDmChannelRecipientFromGateway(
  queryClient: QueryClient,
  payload: UserProfilePayload,
) {
  const profile = toPublicUserProfileFromGateway(payload)
  queryClient.setQueryData<InfiniteData<DmChannelPage>>(dmChannelsQueryKey, (current) => {
    if (!current) return current

    let changed = false
    const pages = current.pages.map((page) => {
      let pageChanged = false
      const channels = page.channels.map((channel) => {
        if (
          channel.recipient.userId !== profile.userId ||
          channel.recipient.updatedAt >= profile.updatedAt
        ) {
          return channel
        }
        pageChanged = true
        return { ...channel, recipient: profile }
      })
      changed = changed || pageChanged
      return pageChanged ? { ...page, channels } : page
    })

    return changed ? { ...current, pages } : current
  })
}

export function clearDmChannelQueries(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: dmChannelsQueryKey })
}

export function toDmChannelSummaryFromReady(channel: ReadyDmChannel): DmChannelSummary {
  return {
    channelId: channel.id,
    createdAt: channel.created_at,
    recipient: toPublicUserProfileFromGateway(channel.recipient),
  }
}

export function toDmChannelSummaryFromGateway(payload: DmChannelCreatedPayload): DmChannelSummary {
  return {
    channelId: payload.channel_id,
    createdAt: payload.created_at,
    recipient: toPublicUserProfileFromGateway(payload.recipient),
  }
}

function toPublicUserProfileFromGateway(payload: UserProfilePayload): PublicUserProfile {
  return {
    avatarAssetId: payload.avatar_asset_id,
    bio: payload.bio,
    createdAt: payload.created_at,
    name: payload.name,
    updatedAt: payload.updated_at,
    userId: payload.user_id,
    username: payload.username,
  }
}

function patchDmChannelPages(
  queryClient: QueryClient,
  update: (pages: DmChannelPage[]) => DmChannelPage[],
) {
  queryClient.setQueryData<InfiniteData<DmChannelPage>>(dmChannelsQueryKey, (current) => {
    if (!current) return current
    return {
      ...current,
      pages: update(current.pages),
    }
  })
}

function upsertDmChannelPages(pages: DmChannelPage[], channel: DmChannelSummary) {
  const [firstPage, ...remainingPages] = pages
  if (!firstPage) return pages

  return [
    {
      ...firstPage,
      channels: [
        channel,
        ...firstPage.channels.filter((item) => item.channelId !== channel.channelId),
      ],
    },
    ...remainingPages.map((page) => ({
      ...page,
      channels: page.channels.filter((item) => item.channelId !== channel.channelId),
    })),
  ]
}
