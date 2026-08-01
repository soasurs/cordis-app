import {
  infiniteQueryOptions,
  queryOptions,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query'

import {
  getMessage,
  listMessages,
  type ChannelMessage,
  type ChannelMessagePage,
} from '@/api/message'
import type { MessageDeletedPayload, MessagePayload } from '@/gateway/protocol/payloads/message'
import type { MessageAuthorPayload } from '@/gateway/protocol/payloads/user'

export type ChannelMessageSummary = ChannelMessage

export function channelMessagesQueryKey(channelId: string) {
  return ['messages', channelId] as const
}

export function referencedMessageQueryKey(messageId: string) {
  return ['message', messageId] as const
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
    queryFn: async ({ pageParam }) => {
      if (!pageParam) {
        const page = await listMessages(channelId, {})
        // Fresh channel open is already the live tip; do not advertise newer pages.
        return { ...page, afterCursor: undefined }
      }
      return listMessages(channelId, { before: pageParam })
    },
    queryKey: channelMessagesQueryKey(channelId),
    staleTime: 30_000,
  })
}

export function referencedMessageQueryOptions(messageId: string) {
  return queryOptions({
    queryFn: () => getMessage(messageId),
    queryKey: referencedMessageQueryKey(messageId),
    staleTime: 60_000,
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

export function findChannelMessageInCache(
  queryClient: QueryClient,
  channelId: string,
  messageId: string,
): ChannelMessageSummary | undefined {
  const data = queryClient.getQueryData<InfiniteData<ChannelMessagePage>>(
    channelMessagesQueryKey(channelId),
  )
  if (!data) return undefined
  for (const page of data.pages) {
    const found = page.messages.find((item) => item.id === messageId)
    if (found) return found
  }
  return undefined
}

/** Replace the channel timeline with one page (used after ListMessages around jumps). */
export function replaceChannelMessagesPage(
  queryClient: QueryClient,
  channelId: string,
  page: ChannelMessagePage,
) {
  queryClient.setQueryData<InfiniteData<ChannelMessagePage>>(channelMessagesQueryKey(channelId), {
    pageParams: [undefined],
    pages: [page],
  })
}

export function channelHasNewerMessages(
  data: InfiniteData<ChannelMessagePage> | undefined,
): boolean {
  return Boolean(data?.pages[0]?.afterCursor)
}

/**
 * Load messages newer than the current head via ListMessages(after).
 * Clears afterCursor when the tip is reached.
 */
export async function loadNewerChannelMessages(
  queryClient: QueryClient,
  channelId: string,
): Promise<{ loaded: boolean }> {
  const key = channelMessagesQueryKey(channelId)
  const current = queryClient.getQueryData<InfiniteData<ChannelMessagePage>>(key)
  const afterCursor = current?.pages[0]?.afterCursor
  if (!afterCursor) return { loaded: false }

  const page = await listMessages(channelId, { after: afterCursor })
  queryClient.setQueryData<InfiniteData<ChannelMessagePage>>(key, (previous) => {
    if (!previous || previous.pages.length === 0) return previous
    const [firstPage, ...rest] = previous.pages
    if (!firstPage) return previous

    if (page.messages.length === 0) {
      return {
        ...previous,
        pages: [{ ...firstPage, afterCursor: undefined }, ...rest],
      }
    }

    const existingIds = new Set(page.messages.map((message) => message.id))
    return {
      ...previous,
      pages: [
        {
          afterCursor: page.afterCursor,
          beforeCursor: firstPage.beforeCursor,
          messages: [
            ...page.messages,
            ...firstPage.messages.filter((message) => !existingIds.has(message.id)),
          ],
        },
        ...rest,
      ],
    }
  })

  return { loaded: page.messages.length > 0 }
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

export function upsertChannelMessageFromGateway(queryClient: QueryClient, payload: MessagePayload) {
  const message = toMessageSummaryFromGateway(payload)
  const key = channelMessagesQueryKey(message.channelId)
  const current = queryClient.getQueryData<InfiniteData<ChannelMessagePage>>(key)
  if (!current) return

  patchChannelMessages(queryClient, message.channelId, (pages) =>
    upsertMessagePages(pages, message, { insertIfMissing: true }),
  )
}

/** Apply an edit only when the message is already in the loaded cache. */
export function patchChannelMessageFromGateway(queryClient: QueryClient, payload: MessagePayload) {
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
    bio: author.bio,
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
        beforeCursor: message.id,
        messages: [message],
      },
    ]
  }

  const [firstPage, ...rest] = nextPages
  const messages = [message, ...firstPage!.messages.filter((item) => item.id !== message.id)]
  return [
    {
      ...firstPage!,
      messages,
    },
    ...rest,
  ]
}
