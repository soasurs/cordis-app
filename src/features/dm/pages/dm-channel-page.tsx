import * as Avatar from '@radix-ui/react-avatar'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { resolveAvatarUrl } from '@/api/assets'
import type { DmChannelSummary } from '@/api/dm'
import { getApiErrorMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { getInitials } from '@/components/layout/app-shell-types'
import { DmChannelView } from '@/features/dm/components/dm-channel-view'
import { dmChannelsInfiniteQueryOptions, flattenDmChannels } from '@/features/dm/dm-queries'
import { useMergeDmReadStates } from '@/features/dm/use-dm-read-states'
import { PresenceIndicator } from '@/features/presence/components/presence-indicator'
import { useResolvePresenceBatches, useUserPresence } from '@/features/presence/presence-queries'

export function DmChannelPage({ channelId, onBack }: { channelId: string; onBack?: () => void }) {
  const channelsQuery = useInfiniteQuery(dmChannelsInfiniteQueryOptions())
  useMergeDmReadStates(channelsQuery.data)
  const channels = flattenDmChannels(channelsQuery.data)
  const channel = channels.find((item) => item.channelId === channelId)
  const presenceBatches = useMemo(() => (channel ? [[channel.recipient.userId]] : []), [channel])
  useResolvePresenceBatches(presenceBatches)

  return (
    <main className="flex min-h-0 flex-1 flex-col bg-surface">
      {channelsQuery.isPending ? <DmChannelLoading /> : null}
      {channelsQuery.isError ? (
        <DmChannelError error={channelsQuery.error} onRetry={() => void channelsQuery.refetch()} />
      ) : null}
      {channelsQuery.isSuccess && !channel ? <DmChannelNotFound onBack={onBack} /> : null}
      {channelsQuery.isSuccess && channel ? (
        <>
          <DmChannelHeader channel={channel} onBack={onBack} />
          <DmChannelView key={channel.channelId} channel={channel} />
        </>
      ) : null}
    </main>
  )
}

function DmChannelHeader({ channel, onBack }: { channel: DmChannelSummary; onBack?: () => void }) {
  const { recipient } = channel
  const presence = useUserPresence(recipient.userId)
  const displayName = recipient.name || recipient.username || `User ${recipient.userId}`
  const avatarUrl = resolveAvatarUrl(recipient.userId, recipient.avatarAssetId)

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur sm:px-5">
      {onBack ? (
        <button
          type="button"
          aria-label="Back to messages"
          className="grid size-8 shrink-0 place-items-center rounded-control text-lg text-muted transition hover:bg-surface-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 sm:hidden"
          onClick={onBack}
        >
          ←
        </button>
      ) : null}
      <span className="relative shrink-0">
        <Avatar.Root className="grid size-9 place-items-center overflow-hidden rounded-control bg-surface-hover text-xs font-bold text-muted">
          {avatarUrl ? (
            <Avatar.Image alt="" className="size-full object-cover" src={avatarUrl} />
          ) : null}
          <Avatar.Fallback>{getInitials(recipient.name, recipient.username)}</Avatar.Fallback>
        </Avatar.Root>
        {presence ? <PresenceIndicator status={presence.status} /> : null}
      </span>
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold text-ink">{displayName}</h2>
        <p className="mt-0.5 truncate text-xs text-subtle">@{recipient.username}</p>
      </div>
    </header>
  )
}

function DmChannelLoading() {
  return (
    <div className="min-h-0 flex-1 px-5 py-8" role="status">
      <p className="text-sm text-muted">Loading conversation…</p>
    </div>
  )
}

function DmChannelError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="min-h-0 flex-1 px-5 py-8">
      <div
        className="rounded-panel border border-negative/25 bg-negative/10 px-5 py-5"
        role="alert"
      >
        <p className="text-sm font-medium text-negative">
          {getApiErrorMessage(error, 'Unable to load this conversation. Please try again.')}
        </p>
        <Button className="mt-4" size="small" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  )
}

function DmChannelNotFound({ onBack }: { onBack?: () => void }) {
  return (
    <div className="grid min-h-0 flex-1 place-items-center px-5 py-8">
      <div className="max-w-md text-center">
        <span
          aria-hidden="true"
          className="mx-auto grid size-11 place-items-center rounded-panel bg-brand-soft text-xl font-bold text-brand-text"
        >
          ✉
        </span>
        <h2 className="mt-5 text-xl font-semibold tracking-[-0.02em] text-ink">
          Conversation not found
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          This conversation is unavailable or no longer in your message list.
        </p>
        {onBack ? (
          <Button className="mt-5" size="small" onClick={onBack}>
            Back to messages
          </Button>
        ) : null}
      </div>
    </div>
  )
}
