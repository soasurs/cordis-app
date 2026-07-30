import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { defaultRangeExtractor, useVirtualizer, type Range } from '@tanstack/react-virtual'
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { getApiErrorMessage } from '@/api/errors'
import { ackMessage, listMessages } from '@/api/message'
import { Button } from '@/components/ui/button'
import { authSessionQueryOptions } from '@/features/auth/auth-session'
import { TextChannelIcon } from '@/features/guilds/components/channel-icons'
import type { GuildChannelSummary } from '@/features/guilds/guild-queries'
import { MessageComposer } from '@/features/messages/components/message-composer'
import { MessageItem } from '@/features/messages/components/message-item'
import {
  channelHasNewerMessages,
  channelMessagesInfiniteQueryOptions,
  findChannelMessageInCache,
  flattenMessagesChronological,
  loadNewerChannelMessages,
  replaceChannelMessagesPage,
  type ChannelMessageSummary,
} from '@/features/messages/message-queries'
import {
  channelReadStatesQueryKey,
  compareSnowflakeId,
  markChannelReadThrough,
  upsertChannelReadState,
  type ChannelReadStatesMap,
} from '@/features/messages/read-state-queries'
import { toMessageReplyTarget, type MessageReplyTarget } from '@/features/messages/reply-target'

const NEAR_BOTTOM_PX = 80
const ACK_DEBOUNCE_MS = 800
const LOAD_OLDER_ROOT_MARGIN = '240px 0px 0px 0px'
const LOAD_NEWER_ROOT_MARGIN = '0px 0px 240px 0px'
const JUMP_HIGHLIGHT_MS = 1_600
const MESSAGE_ESTIMATED_HEIGHT_PX = 88
const MESSAGE_OVERSCAN = 6
/** Avoid flashing a loading row when newer pages resolve quickly. */
const SLOW_NEWER_LOAD_INDICATOR_MS = 350

function isScrollable(element: HTMLDivElement) {
  return element.scrollHeight > element.clientHeight + 1
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
  const messages = useMemo(
    () => flattenMessagesChronological(messagesQuery.data),
    [messagesQuery.data],
  )
  const pageCount = messagesQuery.data?.pages.length ?? 0
  const scrollRef = useRef<HTMLDivElement>(null)
  const messageListRef = useRef<HTMLDivElement>(null)
  const loadOlderSentinelRef = useRef<HTMLDivElement>(null)
  const loadNewerSentinelRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)
  const programmaticScrollRef = useRef(false)
  const initialScrollDoneRef = useRef(false)
  const pendingJumpMessageIdRef = useRef<string | undefined>(undefined)
  // After an around-jump, wait for a real user scroll before auto-loading newer pages.
  const allowNewerAutoloadRef = useRef(true)
  // Do not treat the channel as "seen" until messages paint and scroll position is measured.
  const [nearBottom, setNearBottom] = useState(false)
  const [replyTo, setReplyTo] = useState<MessageReplyTarget>()
  const [highlightedMessageId, setHighlightedMessageId] = useState<string>()
  const ackTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const ackInFlightRef = useRef(false)
  const currentUserId = session?.user.userId.toString()
  const newestMessageId = messages.at(-1)?.id
  const lastReadMessageId = readStates[channel.id]?.lastReadMessageId ?? '0'
  const messagesReady = messagesQuery.isSuccess
  const hasOlderMessages = Boolean(messagesQuery.hasNextPage)
  const hasNewerMessages = channelHasNewerMessages(messagesQuery.data)
  const atLiveTip = !hasNewerMessages
  const isFetchingOlder = messagesQuery.isFetchingNextPage
  // After leaving the live tip (around-jump), keep top alignment for this channel view
  // so catching up to latest does not suddenly re-apply mt-auto and flash the list.
  const [forceTopAlign, setForceTopAlign] = useState(false)
  const [showNewerLoading, setShowNewerLoading] = useState(false)
  const fetchingNewerRef = useRef(false)
  const newerLoadingTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const { fetchNextPage } = messagesQuery
  const newerAfterCursor = messagesQuery.data?.pages[0]?.afterCursor
  const messageCount = messages.length
  const useBottomPinnedLayout = atLiveTip && !forceTopAlign
  const [messageListScrollMargin, setMessageListScrollMargin] = useState(0)
  const [keepMountedMessageIds, setKeepMountedMessageIds] = useState<Set<string>>(() => new Set())
  const messageIndexById = useMemo(
    () => new Map(messages.map((message, index) => [message.id, index])),
    [messages],
  )
  const getItemKey = useCallback(
    (index: number) => messages[index]?.id ?? `missing-message-${index}`,
    [messages],
  )
  const keepMountedIndexes = useMemo(
    () =>
      [...keepMountedMessageIds]
        .flatMap((messageId) => {
          const index = messageIndexById.get(messageId)
          return index === undefined ? [] : [index]
        })
        .sort((left, right) => left - right),
    [keepMountedMessageIds, messageIndexById],
  )
  const rangeExtractor = useCallback(
    (range: Range) => {
      const indexes = defaultRangeExtractor(range)
      if (keepMountedIndexes.length === 0) return indexes
      return [...new Set([...indexes, ...keepMountedIndexes])].sort((left, right) => left - right)
    },
    [keepMountedIndexes],
  )
  // TanStack Virtual intentionally exposes an imperative controller that React Compiler skips.
  // eslint-disable-next-line react-hooks/incompatible-library
  const messageVirtualizer = useVirtualizer({
    anchorTo: 'end',
    count: messageCount,
    estimateSize: () => MESSAGE_ESTIMATED_HEIGHT_PX,
    followOnAppend: true,
    gap: 4,
    getItemKey,
    getScrollElement: () => scrollRef.current,
    overscan: MESSAGE_OVERSCAN,
    rangeExtractor,
    scrollEndThreshold: NEAR_BOTTOM_PX,
    scrollMargin: messageListScrollMargin,
    useFlushSync: false,
  })
  const virtualMessages = messageVirtualizer.getVirtualItems()
  const virtualMessageListHeight = messageVirtualizer.getTotalSize()

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
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
      if (newerLoadingTimerRef.current) clearTimeout(newerLoadingTimerRef.current)
    }
  }, [])

  useLayoutEffect(() => {
    const nextScrollMargin = messageListRef.current?.offsetTop ?? 0
    if (messageListScrollMargin === nextScrollMargin) return
    const root = scrollRef.current
    if (
      root &&
      messageListScrollMargin > 0 &&
      !stickToBottomRef.current &&
      !programmaticScrollRef.current &&
      isScrollable(root)
    ) {
      // The history-start panel lives above the virtual container. Compensate
      // when that external header changes so the visible message stays anchored.
      root.scrollTop += nextScrollMargin - messageListScrollMargin
    }
    setMessageListScrollMargin(nextScrollMargin)
  }, [
    hasOlderMessages,
    messageCount,
    messageListScrollMargin,
    useBottomPinnedLayout,
    virtualMessageListHeight,
  ])

  useLayoutEffect(() => {
    if (!messagesReady || initialScrollDoneRef.current) return
    initialScrollDoneRef.current = true
    setNearBottom(true)
    stickToBottomRef.current = true
    if (!newestMessageId) return

    messageVirtualizer.scrollToEnd()
    // Initial estimates can settle after the first frame.
    const frame = window.requestAnimationFrame(() => {
      if (!programmaticScrollRef.current) messageVirtualizer.scrollToEnd()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [messageVirtualizer, messagesReady, newestMessageId])

  const restoreLiveTipLayout = () => {
    setForceTopAlign(false)
    stickToBottomRef.current = true
    window.requestAnimationFrame(() => {
      messageVirtualizer.scrollToEnd()
      setNearBottom(true)
    })
  }

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
        void fetchNextPage()
      },
      { root, rootMargin: LOAD_OLDER_ROOT_MARGIN },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [fetchNextPage, hasOlderMessages, isFetchingOlder, messagesReady, pageCount])

  const clearNewerLoadingIndicator = () => {
    if (newerLoadingTimerRef.current) {
      clearTimeout(newerLoadingTimerRef.current)
      newerLoadingTimerRef.current = undefined
    }
    setShowNewerLoading(false)
  }

  const startNewerLoad = () => {
    if (!newerAfterCursor || fetchingNewerRef.current) return
    fetchingNewerRef.current = true
    if (newerLoadingTimerRef.current) clearTimeout(newerLoadingTimerRef.current)
    newerLoadingTimerRef.current = setTimeout(() => {
      setShowNewerLoading(true)
    }, SLOW_NEWER_LOAD_INDICATOR_MS)
    void loadNewerChannelMessages(queryClient, channel.id)
      .then((result) => {
        if (!result.loaded) {
          restoreLiveTipLayout()
        }
      })
      .catch(() => undefined)
      .finally(() => {
        fetchingNewerRef.current = false
        clearNewerLoadingIndicator()
      })
  }

  const startNewerLoadOnIntersect = useEffectEvent(startNewerLoad)

  useEffect(() => {
    const root = scrollRef.current
    const sentinel = loadNewerSentinelRef.current
    if (!root || !sentinel || !messagesReady || !hasNewerMessages) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        if (!allowNewerAutoloadRef.current) return
        startNewerLoadOnIntersect()
      },
      { root, rootMargin: LOAD_NEWER_ROOT_MARGIN },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [channel.id, hasNewerMessages, messagesReady, newerAfterCursor, queryClient])

  const enableNewerAutoload = () => {
    if (allowNewerAutoloadRef.current) return
    allowNewerAutoloadRef.current = true
    startNewerLoad()
  }

  const startReply = (message: ChannelMessageSummary) => {
    if (!canSend) return
    setReplyTo(toMessageReplyTarget(message))
  }

  const scrollToMessage = useCallback(
    (messageId: string) => {
      const index = messageIndexById.get(messageId)
      if (index === undefined) return false

      programmaticScrollRef.current = true
      stickToBottomRef.current = false
      setNearBottom(false)
      messageVirtualizer.scrollToIndex(index, { align: 'center', behavior: 'auto' })
      setHighlightedMessageId(messageId)
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
      highlightTimerRef.current = setTimeout(() => {
        setHighlightedMessageId((current) => (current === messageId ? undefined : current))
      }, JUMP_HIGHLIGHT_MS)
      window.setTimeout(() => {
        programmaticScrollRef.current = false
      }, 50)
      return true
    },
    [messageIndexById, messageVirtualizer],
  )

  const jumpToMessage = async (messageId: string) => {
    programmaticScrollRef.current = true
    stickToBottomRef.current = false
    setNearBottom(false)

    if (findChannelMessageInCache(queryClient, channel.id, messageId)) {
      scrollToMessage(messageId)
      return
    }

    try {
      const page = await listMessages(channel.id, { around: messageId })
      if (!page.messages.some((message) => message.id === messageId)) {
        programmaticScrollRef.current = false
        return
      }

      // Pin the timeline at the around window until the user scrolls again.
      allowNewerAutoloadRef.current = false
      setForceTopAlign(true)
      pendingJumpMessageIdRef.current = messageId
      replaceChannelMessagesPage(queryClient, channel.id, page)
    } catch {
      programmaticScrollRef.current = false
      // Preview already shows deleted/unavailable; ignore jump failures.
    }
  }

  useLayoutEffect(() => {
    const messageId = pendingJumpMessageIdRef.current
    if (!messageId || !messageIndexById.has(messageId)) return
    pendingJumpMessageIdRef.current = undefined
    scrollToMessage(messageId)
  }, [messageIndexById, scrollToMessage])

  const setMessageKeepMounted = useCallback((messageId: string, keepMounted: boolean) => {
    setKeepMountedMessageIds((current) => {
      const hasMessage = current.has(messageId)
      if (hasMessage === keepMounted) return current
      const next = new Set(current)
      if (keepMounted) next.add(messageId)
      else next.delete(messageId)
      return next
    })
  }, [])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto"
        onWheel={() => {
          if (programmaticScrollRef.current) return
          enableNewerAutoload()
        }}
        onTouchMove={() => {
          if (programmaticScrollRef.current) return
          enableNewerAutoload()
        }}
        onScroll={() => {
          const element = scrollRef.current
          if (!element) return
          if (programmaticScrollRef.current) return

          enableNewerAutoload()
          const nextNearBottom = messageVirtualizer.isAtEnd(NEAR_BOTTOM_PX)
          setNearBottom(nextNearBottom)
          // Short around-windows report "near bottom" even when not scrollable; do not
          // latch stick-to-bottom then or a jump will immediately chase the live tip.
          stickToBottomRef.current = nextNearBottom && isScrollable(element)
        }}
      >
        <div
          className={`flex w-full flex-col px-4 pt-6 pb-2 sm:px-5 sm:pt-7 sm:pb-3 ${
            useBottomPinnedLayout ? 'min-h-full' : ''
          }`}
        >
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

          {messagesQuery.isPending ? <p className="text-sm text-muted">Loading messages…</p> : null}

          {messagesQuery.isError ? (
            <div
              role="alert"
              className="rounded-control border border-negative/25 bg-negative/10 p-3"
            >
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
            <div
              ref={messageListRef}
              className={`relative w-full ${useBottomPinnedLayout ? 'mt-auto' : ''}`}
              aria-label={`Messages in #${channel.name}`}
              style={{ height: virtualMessageListHeight }}
            >
              {virtualMessages.map((virtualMessage) => {
                const message = messages[virtualMessage.index]
                if (!message) return null
                return (
                  <div
                    key={virtualMessage.key}
                    ref={messageVirtualizer.measureElement}
                    data-index={virtualMessage.index}
                    className={
                      highlightedMessageId === message.id
                        ? 'absolute left-0 w-full rounded-control bg-brand-soft/70 transition-colors'
                        : 'absolute left-0 w-full'
                    }
                    style={{ top: virtualMessage.start - messageListScrollMargin }}
                  >
                    <MessageItem
                      canManageMessages={canManageMessages}
                      message={message}
                      currentUserId={currentUserId}
                      onJumpToMessage={jumpToMessage}
                      onKeepMountedChange={setMessageKeepMounted}
                      onReply={canSend ? startReply : undefined}
                    />
                  </div>
                )
              })}
            </div>
          ) : null}
          {messagesQuery.isSuccess && hasNewerMessages ? (
            <div ref={loadNewerSentinelRef} className="h-px w-full shrink-0" aria-hidden="true" />
          ) : null}
          {showNewerLoading ? (
            <p className="py-2 text-center text-xs text-muted" role="status">
              Loading newer messages…
            </p>
          ) : null}
        </div>
      </div>

      <MessageComposer
        canSend={canSend}
        channelId={channel.id}
        channelName={channel.name}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(undefined)}
      />
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
