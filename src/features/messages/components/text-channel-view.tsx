import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { getApiErrorMessage } from '@/api/errors'
import { ackMessage } from '@/api/message'
import { Button } from '@/components/ui/button'
import { authSessionQueryOptions } from '@/features/auth/auth-session'
import { TextChannelIcon } from '@/features/guilds/components/channel-icons'
import type { GuildChannelSummary } from '@/features/guilds/guild-queries'
import { MessageComposer } from '@/features/messages/components/message-composer'
import { MessageItem } from '@/features/messages/components/message-item'
import {
  channelMessagesInfiniteQueryOptions,
  flattenMessagesChronological,
} from '@/features/messages/message-queries'
import {
  channelReadStatesQueryKey,
  compareSnowflakeId,
  markChannelReadThrough,
  upsertChannelReadState,
  type ChannelReadStatesMap,
} from '@/features/messages/read-state-queries'

const NEAR_BOTTOM_PX = 80
const ACK_DEBOUNCE_MS = 800
const LOAD_OLDER_ROOT_MARGIN = '240px 0px 0px 0px'

function isNearBottom(element: HTMLDivElement) {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= NEAR_BOTTOM_PX
}

interface TextChannelViewProps {
  canManageMessages: boolean
  canSend: boolean
  channel: GuildChannelSummary
}

export function TextChannelView({ canManageMessages, canSend, channel }: TextChannelViewProps) {
  const queryClient = useQueryClient()
  const { data: session } = useQuery(authSessionQueryOptions)
  const { data: readStates = {} } = useQuery({
    queryFn: () =>
      queryClient.getQueryData<ChannelReadStatesMap>(channelReadStatesQueryKey()) ?? {},
    queryKey: channelReadStatesQueryKey(),
    staleTime: Infinity,
  })
  const messagesQuery = useInfiniteQuery(channelMessagesInfiniteQueryOptions(channel.id))
  const messages = flattenMessagesChronological(messagesQuery.data)
  const pageCount = messagesQuery.data?.pages.length ?? 0
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const loadOlderSentinelRef = useRef<HTMLDivElement>(null)
  const pendingScrollHeightRef = useRef<number | null>(null)
  const previousNewestIdRef = useRef<string | undefined>(undefined)
  const stickToBottomRef = useRef(true)
  // Do not treat the channel as "seen" until messages paint and scroll position is measured.
  const [nearBottom, setNearBottom] = useState(false)
  const ackTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const ackInFlightRef = useRef(false)
  const currentUserId = session?.user.userId.toString()
  const newestMessageId = messages.at(-1)?.id
  const lastReadMessageId = readStates[channel.id]?.lastReadMessageId ?? '0'
  const messagesReady = messagesQuery.isSuccess
  const hasOlderMessages = Boolean(messagesQuery.hasNextPage)
  const isFetchingOlder = messagesQuery.isFetchingNextPage
  const { fetchNextPage } = messagesQuery

  const { mutate: ackMutate } = useMutation({
    mutationFn: (messageId: string) => ackMessage(channel.id, messageId),
    onMutate: () => {
      ackInFlightRef.current = true
    },
    onSettled: () => {
      ackInFlightRef.current = false
    },
    onSuccess: (state) => {
      upsertChannelReadState(queryClient, state)
    },
  })

  useEffect(() => {
    return () => {
      if (ackTimerRef.current) clearTimeout(ackTimerRef.current)
    }
  }, [])

  useEffect(() => {
    // Stick to bottom on first paint and when already near the latest message.
    if (!newestMessageId) return
    if (previousNewestIdRef.current === newestMessageId) return

    const shouldScroll =
      previousNewestIdRef.current === undefined || stickToBottomRef.current
    previousNewestIdRef.current = newestMessageId
    if (!shouldScroll) return

    bottomRef.current?.scrollIntoView({ block: 'end' })
    // Measure after layout so we only ack once the latest messages are actually on screen.
    const frame = window.requestAnimationFrame(() => {
      const element = scrollRef.current
      if (!element) return
      const nextNearBottom = isNearBottom(element)
      stickToBottomRef.current = nextNearBottom
      setNearBottom(nextNearBottom)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [newestMessageId])

  useEffect(() => {
    if (!messagesReady || !newestMessageId || !nearBottom) return
    if (compareSnowflakeId(newestMessageId, lastReadMessageId) <= 0) return
    if (ackInFlightRef.current) return

    if (ackTimerRef.current) clearTimeout(ackTimerRef.current)
    ackTimerRef.current = setTimeout(() => {
      if (!stickToBottomRef.current || ackInFlightRef.current) return
      markChannelReadThrough(queryClient, channel.id, newestMessageId)
      ackMutate(newestMessageId)
    }, ACK_DEBOUNCE_MS)
    // mutate from useMutation is referentially stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ackMutate is the stable mutate handle
  }, [
    ackMutate,
    channel.id,
    lastReadMessageId,
    messagesReady,
    nearBottom,
    newestMessageId,
    queryClient,
  ])

  useEffect(() => {
    const root = scrollRef.current
    const sentinel = loadOlderSentinelRef.current
    if (!root || !sentinel || !messagesReady || !hasOlderMessages) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        if (!hasOlderMessages || isFetchingOlder) return
        pendingScrollHeightRef.current = root.scrollHeight
        void fetchNextPage()
      },
      { root, rootMargin: LOAD_OLDER_ROOT_MARGIN },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [fetchNextPage, hasOlderMessages, isFetchingOlder, messagesReady, pageCount])

  useLayoutEffect(() => {
    const root = scrollRef.current
    const previousHeight = pendingScrollHeightRef.current
    if (!root || previousHeight == null) return
    pendingScrollHeightRef.current = null

    if (stickToBottomRef.current) {
      bottomRef.current?.scrollIntoView({ block: 'end' })
      return
    }

    root.scrollTop += root.scrollHeight - previousHeight
  }, [pageCount])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto"
        onScroll={() => {
          const element = scrollRef.current
          if (!element) return
          const nextNearBottom = isNearBottom(element)
          stickToBottomRef.current = nextNearBottom
          setNearBottom(nextNearBottom)
        }}
      >
        <div className="flex min-h-full w-full flex-col px-4 py-6 sm:px-5 sm:py-7">
          <div className="mb-6">
            {messagesReady && hasOlderMessages ? (
              <div
                ref={loadOlderSentinelRef}
                className="flex min-h-8 items-center justify-center"
                aria-hidden={isFetchingOlder ? undefined : true}
              >
                {isFetchingOlder ? (
                  <p className="text-xs text-muted" role="status">
                    Loading older messages…
                  </p>
                ) : null}
              </div>
            ) : null}

            {messagesReady && !hasOlderMessages ? <ChannelHistoryStart channel={channel} /> : null}
          </div>

          {messagesQuery.isPending ? (
            <p className="text-sm text-muted">Loading messages…</p>
          ) : null}

          {messagesQuery.isError ? (
            <div role="alert" className="rounded-control border border-negative/25 bg-negative/10 p-3">
              <p className="text-xs leading-5 text-negative">
                {getApiErrorMessage(
                  messagesQuery.error,
                  'Unable to load messages. Please try again.',
                )}
              </p>
              <Button
                className="mt-3"
                size="small"
                variant="secondary"
                onClick={() => void messagesQuery.refetch()}
              >
                Try again
              </Button>
            </div>
          ) : null}

          {messagesQuery.isSuccess ? (
            <div className="mt-auto flex flex-col gap-1" aria-label={`Messages in #${channel.name}`}>
              {messages.map((message) => (
                <MessageItem
                  key={message.id}
                  canManageMessages={canManageMessages}
                  message={message}
                  currentUserId={currentUserId}
                />
              ))}
              <div ref={bottomRef} />
            </div>
          ) : null}
        </div>
      </div>

      <MessageComposer canSend={canSend} channelId={channel.id} channelName={channel.name} />
    </div>
  )
}

function ChannelHistoryStart({ channel }: { channel: GuildChannelSummary }) {
  return (
    <div>
      <span className="grid size-11 place-items-center rounded-panel bg-brand-soft text-xl font-bold text-brand-text">
        <TextChannelIcon className="size-5" />
      </span>
      <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-ink">
        Welcome to #{channel.name}
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
        {channel.topic || 'This is the beginning of this channel.'}
      </p>
    </div>
  )
}
