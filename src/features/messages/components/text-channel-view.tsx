import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import { getApiErrorMessage } from '@/api/errors'
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

const NEAR_BOTTOM_PX = 80

interface TextChannelViewProps {
  canManageMessages: boolean
  canSend: boolean
  channel: GuildChannelSummary
}

export function TextChannelView({ canManageMessages, canSend, channel }: TextChannelViewProps) {
  const { data: session } = useQuery(authSessionQueryOptions)
  const messagesQuery = useInfiniteQuery(channelMessagesInfiniteQueryOptions(channel.id))
  const messages = flattenMessagesChronological(messagesQuery.data)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const previousNewestIdRef = useRef<string | undefined>(undefined)
  const stickToBottomRef = useRef(true)
  const currentUserId = session?.user.userId.toString()
  const newestMessageId = messages.at(-1)?.id

  useEffect(() => {
    previousNewestIdRef.current = undefined
    stickToBottomRef.current = true
  }, [channel.id])

  useEffect(() => {
    // Stick to bottom on first paint and when already near the latest message.
    if (!newestMessageId) return
    if (previousNewestIdRef.current === newestMessageId) return

    const shouldScroll =
      previousNewestIdRef.current === undefined || stickToBottomRef.current
    previousNewestIdRef.current = newestMessageId
    if (shouldScroll) {
      bottomRef.current?.scrollIntoView({ block: 'end' })
    }
  }, [newestMessageId])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto"
        onScroll={() => {
          const element = scrollRef.current
          if (!element) return
          stickToBottomRef.current =
            element.scrollHeight - element.scrollTop - element.clientHeight <= NEAR_BOTTOM_PX
        }}
      >
        <div className="flex min-h-full w-full flex-col px-4 py-6 sm:px-5 sm:py-7">
          <div className="mb-6">
            {messagesQuery.hasNextPage ? (
              <div className="mb-4">
                <Button
                  size="small"
                  variant="secondary"
                  disabled={messagesQuery.isFetchingNextPage}
                  loading={messagesQuery.isFetchingNextPage}
                  onClick={() => void messagesQuery.fetchNextPage()}
                >
                  Load older messages
                </Button>
              </div>
            ) : null}

            <ChannelHistoryStart channel={channel} />
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
