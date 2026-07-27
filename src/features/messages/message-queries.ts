import {
  infiniteQueryOptions,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query'

import {
  listMessages,
  type ChannelMessage,
  type ChannelMessagePage,
} from '@/api/message'
import type {
  MessageDeletedPayload,
  MessagePayload,
} from '@/gateway/protocol/payloads/message'
import type { MessageAuthorPayload } from '@/gateway/protocol/payloads/user'

export type ChannelMessageSummary = ChannelMessage

export function channelMessagesQueryKey(channelId: string) {
  return ['messages', channelId] as const
}

export function channelMessagesInfiniteQueryOptions(channelId: string) {
  return infiniteQueryOptions<
    ChannelMessagePage,
    Error,
    InfiniteData<ChannelMessagePage>,
    ReturnType<typeof channelMessagesQueryKey>,
    string | undefined
  >({
    getNextPageParam: (lastPage) => lastPage.beforeCursor,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listMessages(channelId, pageParam ? { before: pageParam } : {}),
    queryKey: channelMessagesQueryKey(channelId),
    staleTime: 30_000,
  })
}

/** Newest-first pages flattened then reversed for chronological display. */
export function flattenMessagesChronological(
  data: InfiniteData<ChannelMessagePage> | undefined,
): ChannelMessageSummary[] {
  if (!data) return []
  return data.pages
    .flatMap((page) => page.messages)
    .slice()
    .reverse()
}

export function upsertChannelMessageFromApi(
  queryClient: QueryClient,
  message: ChannelMessageSummary,
) {
  patchChannelMessages(queryClient, message.channelId, (pages) =>
    upsertMessagePages(pages, message, { insertIfMissing: true }),
  )
}

export function removeChannelMessageFromApi(
  queryClient: QueryClient,
  channelId: string,
  messageId: string,
) {
  patchChannelMessages(queryClient, channelId, (pages) =>
    pages.map((page) => ({
      ...page,
      messages: page.messages.filter((item) => item.id !== messageId),
    })),
  )
}

export function upsertChannelMessageFromGateway(
  queryClient: QueryClient,
  payload: MessagePayload,
) {
  const message = toMessageSummaryFromGateway(payload)
  const key = channelMessagesQueryKey(message.channelId)
  const current = queryClient.getQueryData<InfiniteData<ChannelMessagePage>>(key)
  if (!current) return

  patchChannelMessages(queryClient, message.channelId, (pages) =>
    upsertMessagePages(pages, message, { insertIfMissing: true }),
  )
}

/** Apply an edit only when the message is already in the loaded cache. */
export function patchChannelMessageFromGateway(
  queryClient: QueryClient,
  payload: MessagePayload,
) {
  const message = toMessageSummaryFromGateway(payload)
  const key = channelMessagesQueryKey(message.channelId)
  const current = queryClient.getQueryData<InfiniteData<ChannelMessagePage>>(key)
  if (!current) return

  patchChannelMessages(queryClient, message.channelId, (pages) =>
    upsertMessagePages(pages, message, { insertIfMissing: false }),
  )
}

export function removeChannelMessageFromGateway(
  queryClient: QueryClient,
  payload: MessageDeletedPayload,
) {
  const key = channelMessagesQueryKey(payload.channel_id)
  const current = queryClient.getQueryData<InfiniteData<ChannelMessagePage>>(key)
  if (!current) return

  removeChannelMessageFromApi(queryClient, payload.channel_id, payload.id)
}

export function clearChannelMessageQueries(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: ['messages'] })
}

export function toMessageSummaryFromGateway(payload: MessagePayload): ChannelMessageSummary {
  return {
    attachments: payload.attachments.map((attachment) => ({
      assetId: attachment.asset_id,
      contentType: attachment.content_type,
      filename: attachment.filename,
      height: attachment.height,
      size: attachment.size,
      url: attachment.url,
      urlExpiresAt: attachment.url_expires_at,
      width: attachment.width,
    })),
    author: toAuthorProfile(payload.author),
    channelId: payload.channel_id,
    content: payload.content,
    createdAt: payload.created_at,
    editedAt: payload.edited_at,
    flags: payload.flags,
    id: payload.id,
    referencedChannelId: payload.referenced_channel_id,
    referencedMessageId: payload.referenced_message_id,
    revision: payload.revision,
    type: payload.type,
    updatedAt: payload.updated_at,
  }
}

function toAuthorProfile(author: MessageAuthorPayload) {
  return {
    avatarAssetId: author.avatar_asset_id,
    createdAt: author.created_at,
    name: author.name,
    updatedAt: author.updated_at,
    userId: author.user_id,
    username: author.username,
  }
}

function patchChannelMessages(
  queryClient: QueryClient,
  channelId: string,
  update: (pages: ChannelMessagePage[]) => ChannelMessagePage[],
) {
  queryClient.setQueryData<InfiniteData<ChannelMessagePage>>(
    channelMessagesQueryKey(channelId),
    (current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        pages: update(current.pages),
      }
    },
  )
}

/**
 * Pages store messages newest-first. Creates prepend to page 0; updates replace
 * in place when revision is newer. Updates for unloaded messages are ignored.
 */
function upsertMessagePages(
  pages: ChannelMessagePage[],
  message: ChannelMessageSummary,
  options: { insertIfMissing: boolean },
): ChannelMessagePage[] {
  let found = false
  const nextPages = pages.map((page) => {
    const index = page.messages.findIndex((item) => item.id === message.id)
    if (index < 0) return page

    found = true
    const existing = page.messages[index]!
    if (existing.revision > message.revision) return page

    const messages = page.messages.slice()
    messages[index] = message
    return { ...page, messages }
  })

  if (found || !options.insertIfMissing) return nextPages

  if (nextPages.length === 0) {
    return [
      {
        afterCursor: message.id,
        beforeCursor: message.id,
        messages: [message],
      },
    ]
  }

  const [firstPage, ...rest] = nextPages
  const messages = [
    message,
    ...firstPage!.messages.filter((item) => item.id !== message.id),
  ]
  return [
    {
      ...firstPage!,
      afterCursor: message.id,
      messages,
    },
    ...rest,
  ]
}
