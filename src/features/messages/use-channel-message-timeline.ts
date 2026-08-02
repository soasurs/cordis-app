import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react'

import { ackMessage, listMessages } from '@/api/message'
import { extractDirectMentionUserIds } from '@/features/messages/mentions'
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
  compareSnowflakeId,
  markChannelReadThrough,
  useChannelReadStates,
  upsertChannelReadState,
} from '@/features/messages/read-state-queries'
import { toMessageReplyTarget, type MessageReplyTarget } from '@/features/messages/reply-target'

const NEAR_BOTTOM_PX = 80
const ACK_DEBOUNCE_MS = 800
const LOAD_OLDER_ROOT_MARGIN = '240px 0px 0px 0px'
const LOAD_NEWER_ROOT_MARGIN = '0px 0px 240px 0px'
const JUMP_HIGHLIGHT_MS = 1_600
/** Avoid flashing a loading row when newer pages resolve quickly. */
const SLOW_NEWER_LOAD_INDICATOR_MS = 350

function isNearBottom(element: HTMLDivElement) {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= NEAR_BOTTOM_PX
}

function isScrollable(element: HTMLDivElement) {
  return element.scrollHeight > element.clientHeight + 1
}

function scrollToAbsoluteBottom(element: HTMLDivElement) {
  element.scrollTop = element.scrollHeight
}

export function useChannelMessageTimeline({
  canSend,
  channelId,
}: {
  canSend: boolean
  channelId: string
}) {
  const queryClient = useQueryClient()
  const { data: readStates = {} } = useChannelReadStates()
  const messagesQuery = useInfiniteQuery(channelMessagesInfiniteQueryOptions(channelId))
  const messages = flattenMessagesChronological(messagesQuery.data)
  const hasMentions = messages.some(
    (message) =>
      message.mentionEveryone ||
      message.mentionRoleIds.length > 0 ||
      message.mentionUserIds.length > 0,
  )
  const directMentionUserIds = [
    ...new Set(messages.flatMap((message) => extractDirectMentionUserIds(message.content))),
  ]
  const pageCount = messagesQuery.data?.pages.length ?? 0
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const loadOlderSentinelRef = useRef<HTMLDivElement>(null)
  const loadNewerSentinelRef = useRef<HTMLDivElement>(null)
  const pendingScrollHeightRef = useRef<number | null>(null)
  const pendingNewerScrollTopRef = useRef<number | null>(null)
  const previousNewestIdRef = useRef<string | undefined>(undefined)
  const stickToBottomRef = useRef(true)
  const programmaticScrollRef = useRef(false)
  // After an around-jump, wait for a real user scroll before auto-loading newer pages.
  const allowNewerAutoloadRef = useRef(true)
  // Do not treat the channel as "seen" until messages paint and scroll position is measured.
  const [nearBottom, setNearBottom] = useState(false)
  const [replyTo, setReplyTo] = useState<MessageReplyTarget>()
  const [highlightedMessageId, setHighlightedMessageId] = useState<string>()
  const ackTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const ackInFlightRef = useRef(false)
  const newestMessageId = messages.at(-1)?.id
  const lastReadMessageId = readStates[channelId]?.lastReadMessageId ?? '0'
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

  const { mutate: ackMutate } = useMutation({
    mutationFn: (messageId: string) => ackMessage(channelId, messageId),
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
    if (!messagesReady || !newestMessageId) return
    if (programmaticScrollRef.current) {
      previousNewestIdRef.current = newestMessageId
      return
    }

    const root = scrollRef.current
    if (!root) return

    const isFirstPaint = previousNewestIdRef.current === undefined
    previousNewestIdRef.current = newestMessageId

    const shouldStick =
      isFirstPaint || stickToBottomRef.current || (atLiveTip && !isScrollable(root))
    if (!shouldStick) return

    // scrollTop is more reliable than scrollIntoView with min-h-full + mt-auto.
    scrollToAbsoluteBottom(root)
    const nextNearBottom = isNearBottom(root)
    setNearBottom(nextNearBottom)
    stickToBottomRef.current = nextNearBottom && (isScrollable(root) || atLiveTip)

    // Layout can settle after this frame (mt-auto / fonts); re-assert once.
    const frame = window.requestAnimationFrame(() => {
      const element = scrollRef.current
      if (!element || programmaticScrollRef.current) return
      if (!stickToBottomRef.current) return
      scrollToAbsoluteBottom(element)
      setNearBottom(isNearBottom(element))
    })
    return () => window.cancelAnimationFrame(frame)
  }, [atLiveTip, messageCount, messagesReady, newestMessageId, useBottomPinnedLayout])

  useEffect(() => {
    if (!messagesReady || !newestMessageId || !nearBottom) return
    if (compareSnowflakeId(newestMessageId, lastReadMessageId) <= 0) return
    if (ackInFlightRef.current) return

    if (ackTimerRef.current) clearTimeout(ackTimerRef.current)
    ackTimerRef.current = setTimeout(() => {
      if (!stickToBottomRef.current || ackInFlightRef.current) return
      markChannelReadThrough(queryClient, channelId, newestMessageId)
      ackMutate(newestMessageId)
    }, ACK_DEBOUNCE_MS)
  }, [
    ackMutate,
    channelId,
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

  const restoreLiveTipLayout = () => {
    setForceTopAlign(false)
    stickToBottomRef.current = true
  }

  const clearNewerLoadingIndicator = () => {
    if (newerLoadingTimerRef.current) {
      clearTimeout(newerLoadingTimerRef.current)
      newerLoadingTimerRef.current = undefined
    }
    setShowNewerLoading(false)
  }

  const startNewerLoad = () => {
    const root = scrollRef.current
    if (!newerAfterCursor || fetchingNewerRef.current) return
    fetchingNewerRef.current = true
    if (root) pendingNewerScrollTopRef.current = root.scrollTop
    if (newerLoadingTimerRef.current) clearTimeout(newerLoadingTimerRef.current)
    newerLoadingTimerRef.current = setTimeout(() => {
      setShowNewerLoading(true)
    }, SLOW_NEWER_LOAD_INDICATOR_MS)
    void loadNewerChannelMessages(queryClient, channelId)
      .then((result) => {
        if (!result.loaded) {
          // Tip reached: drop the scroll anchor so we don't fight sentinel unmount.
          pendingNewerScrollTopRef.current = null
          restoreLiveTipLayout()
        }
      })
      .catch(() => {
        pendingNewerScrollTopRef.current = null
      })
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
  }, [channelId, hasNewerMessages, messagesReady, newerAfterCursor, queryClient])

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

  // Newer pages append below; keep the current viewport anchored.
  useLayoutEffect(() => {
    const root = scrollRef.current
    const previousTop = pendingNewerScrollTopRef.current
    if (!root || previousTop == null) return
    pendingNewerScrollTopRef.current = null
    if (stickToBottomRef.current || programmaticScrollRef.current) return
    root.scrollTop = previousTop
  }, [messageCount, newerAfterCursor])

  const enableNewerAutoload = () => {
    if (allowNewerAutoloadRef.current) return
    allowNewerAutoloadRef.current = true
    startNewerLoad()
  }

  const startReply = (message: ChannelMessageSummary) => {
    if (!canSend) return
    setReplyTo(toMessageReplyTarget(message))
  }

  const scrollToMessage = (messageId: string) => {
    const root = scrollRef.current
    if (!root) return false
    const target = root.querySelector<HTMLElement>(`[data-message-id="${messageId}"]`)
    if (!target) return false

    programmaticScrollRef.current = true
    stickToBottomRef.current = false
    setNearBottom(false)
    // Instant jump avoids smooth-scroll racing with layout changes after around replace.
    target.scrollIntoView({ block: 'center', behavior: 'auto' })
    setHighlightedMessageId(messageId)
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedMessageId((current) => (current === messageId ? undefined : current))
    }, JUMP_HIGHLIGHT_MS)
    window.setTimeout(() => {
      programmaticScrollRef.current = false
    }, 50)
    return true
  }

  const jumpToMessage = async (messageId: string) => {
    programmaticScrollRef.current = true
    stickToBottomRef.current = false
    setNearBottom(false)

    if (findChannelMessageInCache(queryClient, channelId, messageId)) {
      scrollToMessage(messageId)
      return
    }

    try {
      const page = await listMessages(channelId, { around: messageId })
      if (!page.messages.some((message) => message.id === messageId)) {
        programmaticScrollRef.current = false
        return
      }

      // Pin the timeline at the around window until the user scrolls again.
      allowNewerAutoloadRef.current = false
      setForceTopAlign(true)
      // Avoid the stick-to-bottom effect treating the around head as a live tip update.
      previousNewestIdRef.current = page.messages[0]?.id
      replaceChannelMessagesPage(queryClient, channelId, page)
      // Wait for the replaced timeline to paint before scrolling.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToMessage(messageId)
        })
      })
    } catch {
      programmaticScrollRef.current = false
      // Preview already shows deleted/unavailable; ignore jump failures.
    }
  }

  const handleWheel = () => {
    if (programmaticScrollRef.current) return
    enableNewerAutoload()
  }

  const handleTouchMove = () => {
    if (programmaticScrollRef.current) return
    enableNewerAutoload()
  }

  const handleScroll = () => {
    const element = scrollRef.current
    if (!element || programmaticScrollRef.current) return

    enableNewerAutoload()
    const nextNearBottom = isNearBottom(element)
    setNearBottom(nextNearBottom)
    // Short around-windows report "near bottom" even when not scrollable; do not
    // latch stick-to-bottom then or a jump will immediately chase the live tip.
    stickToBottomRef.current = nextNearBottom && isScrollable(element)
  }

  return {
    bottomRef,
    clearReply: () => setReplyTo(undefined),
    directMentionUserIds,
    error: messagesQuery.error,
    handleScroll,
    handleTouchMove,
    handleWheel,
    hasMentions,
    hasNewerMessages,
    hasOlderMessages,
    highlightedMessageId,
    isError: messagesQuery.isError,
    isFetchingOlder,
    isPending: messagesQuery.isPending,
    isSuccess: messagesQuery.isSuccess,
    jumpToMessage,
    loadNewerSentinelRef,
    loadOlderSentinelRef,
    messages,
    messageListCount: messages.length,
    refetch: messagesQuery.refetch,
    replyTo,
    scrollRef,
    showNewerLoading,
    startReply,
    useBottomPinnedLayout,
  }
}
