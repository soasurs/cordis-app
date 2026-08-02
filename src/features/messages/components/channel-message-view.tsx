import { useQuery } from '@tanstack/react-query'
import { type ReactNode } from 'react'

import { getApiErrorMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { authSessionQueryOptions } from '@/features/auth/auth-session'
import { MessageComposer } from '@/features/messages/components/message-composer'
import { MessageItem } from '@/features/messages/components/message-item'
import {
  useGuildMentionCandidates,
  type MentionCandidate,
  type MentionCandidateSearch,
} from '@/features/messages/mentions'
import { useChannelMessageTimeline } from '@/features/messages/use-channel-message-timeline'

interface ChannelMessageViewProps {
  canManageMessages: boolean
  canMentionRolesAndEveryone: boolean
  canSend: boolean
  channelId: string
  channelName: string
  /**
   * When set (guild text channels), mention candidates are derived from guild
   * members/roles. DM channels pass explicit candidates instead.
   */
  guildId?: string
  /** Rendered at the top of history when no older pages exist. */
  historyStart?: ReactNode
  mentionCandidates?: MentionCandidate[]
  messageListLabel?: string
  onLoadMoreMentionCandidates?: () => void
  onSearchMentionCandidates?: MentionCandidateSearch
}

export function ChannelMessageView({
  canManageMessages,
  canMentionRolesAndEveryone,
  canSend,
  channelId,
  channelName,
  guildId,
  historyStart,
  mentionCandidates = [],
  messageListLabel = channelName,
  onLoadMoreMentionCandidates,
  onSearchMentionCandidates,
}: ChannelMessageViewProps) {
  const { data: session } = useQuery(authSessionQueryOptions)
  const {
    bottomRef,
    clearReply,
    directMentionUserIds,
    error,
    handleScroll,
    handleTouchMove,
    handleWheel,
    hasMentions,
    hasNewerMessages,
    hasOlderMessages,
    highlightedMessageId,
    isError,
    isFetchingOlder,
    isPending,
    isSuccess,
    jumpToMessage,
    loadNewerSentinelRef,
    loadOlderSentinelRef,
    messages,
    refetch,
    replyTo,
    scrollRef,
    showNewerLoading,
    startReply,
    useBottomPinnedLayout,
  } = useChannelMessageTimeline({ canSend, channelId })
  const guildMentionCandidates = useGuildMentionCandidates(
    guildId,
    guildId ? channelId : undefined,
    hasMentions,
    directMentionUserIds,
  )
  const resolvedMentionCandidates = guildId ? guildMentionCandidates.candidates : mentionCandidates
  const resolvedLoadMoreMentionCandidates = guildId
    ? guildMentionCandidates.fetchNextMembersPage
      ? () => void guildMentionCandidates.fetchNextMembersPage?.()
      : undefined
    : onLoadMoreMentionCandidates
  const resolvedSearchMentionCandidates = guildId
    ? guildMentionCandidates.searchMentionCandidates
    : onSearchMentionCandidates

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto"
        onWheel={handleWheel}
        onTouchMove={handleTouchMove}
        onScroll={handleScroll}
      >
        <div
          className={`flex w-full flex-col px-4 pt-6 pb-2 sm:px-5 sm:pt-7 sm:pb-3 ${
            useBottomPinnedLayout ? 'min-h-full' : ''
          }`}
        >
          <div className="mb-6">
            {isSuccess && hasOlderMessages ? (
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

            {isSuccess && !hasOlderMessages && historyStart ? historyStart : null}
          </div>

          {isPending ? <p className="text-sm text-muted">Loading messages…</p> : null}

          {isError ? (
            <div
              role="alert"
              className="rounded-control border border-negative/25 bg-negative/10 p-3"
            >
              <p className="text-xs leading-5 text-negative">
                {getApiErrorMessage(error, 'Unable to load messages. Please try again.')}
              </p>
              <Button
                className="mt-3"
                size="small"
                variant="secondary"
                onClick={() => void refetch()}
              >
                Try again
              </Button>
            </div>
          ) : null}

          {isSuccess ? (
            <div
              className={`flex flex-col gap-1 ${useBottomPinnedLayout ? 'mt-auto' : ''}`}
              aria-label={`Messages in ${messageListLabel}`}
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    highlightedMessageId === message.id
                      ? 'rounded-control bg-brand-soft/70 transition-colors'
                      : undefined
                  }
                >
                  <MessageItem
                    canManageMessages={canManageMessages}
                    canMentionRolesAndEveryone={canMentionRolesAndEveryone}
                    message={message}
                    currentUserId={session?.user.userId.toString()}
                    mentionCandidates={resolvedMentionCandidates}
                    onJumpToMessage={jumpToMessage}
                    onLoadMoreMentionCandidates={resolvedLoadMoreMentionCandidates}
                    onReply={canSend ? startReply : undefined}
                    onSearchMentionCandidates={resolvedSearchMentionCandidates}
                  />
                </div>
              ))}
              {hasNewerMessages ? (
                <div
                  ref={loadNewerSentinelRef}
                  className="h-px w-full shrink-0"
                  aria-hidden="true"
                />
              ) : null}
              {showNewerLoading ? (
                <p className="py-2 text-center text-xs text-muted" role="status">
                  Loading newer messages…
                </p>
              ) : null}
              <div ref={bottomRef} />
            </div>
          ) : null}
        </div>
      </div>

      <MessageComposer
        canMentionRolesAndEveryone={canMentionRolesAndEveryone}
        canSend={canSend}
        channelId={channelId}
        channelName={channelName}
        mentionCandidates={resolvedMentionCandidates}
        replyTo={replyTo}
        onLoadMoreMentionCandidates={resolvedLoadMoreMentionCandidates}
        onClearReply={clearReply}
        onSearchMentionCandidates={resolvedSearchMentionCandidates}
      />
    </div>
  )
}
