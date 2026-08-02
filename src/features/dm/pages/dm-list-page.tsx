import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { getApiErrorMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { DmChannelRow } from '@/features/dm/components/dm-channel-row'
import { dmChannelsInfiniteQueryOptions, flattenDmChannels } from '@/features/dm/dm-queries'
import { useMergeDmReadStates } from '@/features/dm/use-dm-read-states'
import { useResolvePresenceBatches } from '@/features/presence/presence-queries'
import { useChannelReadStates } from '@/features/messages/read-state-queries'

export function DmListPage({
  activeChannelId,
  onOpenNewDm,
  onSelectChannel,
}: {
  activeChannelId?: string
  onOpenNewDm?: () => void
  onSelectChannel: (channelId: string) => void
}) {
  const channelsQuery = useInfiniteQuery(dmChannelsInfiniteQueryOptions())
  useMergeDmReadStates(channelsQuery.data)
  const { data: readStates = {} } = useChannelReadStates()
  const channels = flattenDmChannels(channelsQuery.data)
  const presenceBatches = useMemo(
    () => [channels.map((channel) => channel.recipient.userId)],
    [channels],
  )
  useResolvePresenceBatches(presenceBatches)

  return (
    <main className="flex min-h-0 flex-1 flex-col bg-surface">
      <header className="shrink-0 border-b border-line bg-surface/90 px-5 pt-5 backdrop-blur sm:px-7">
        <div className="mx-auto w-full max-w-5xl">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-brand-text">
            Personal space
          </p>
          <div className="mt-1 flex items-center justify-between gap-4">
            <h1 className="text-xl font-semibold tracking-[-0.025em] text-ink">Messages</h1>
            <Button size="small" onClick={onOpenNewDm}>
              New message
            </Button>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Your private conversations with friends and contacts.
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto w-full max-w-5xl">
          {channelsQuery.isPending ? <DmListLoading /> : null}
          {channelsQuery.isError ? (
            <DmListError error={channelsQuery.error} onRetry={() => void channelsQuery.refetch()} />
          ) : null}
          {channelsQuery.isSuccess && channels.length === 0 ? (
            <DmListEmpty onOpenNewDm={onOpenNewDm} />
          ) : null}
          {channelsQuery.isSuccess && channels.length > 0 ? (
            <div>
              <ul className="grid gap-1">
                {channels.map((channel) => (
                  <DmChannelRow
                    key={channel.channelId}
                    active={channel.channelId === activeChannelId}
                    channel={channel}
                    readState={readStates[channel.channelId]}
                    onSelect={onSelectChannel}
                  />
                ))}
              </ul>
              {channelsQuery.hasNextPage ? (
                <div className="mt-4 flex justify-center">
                  <Button
                    loading={channelsQuery.isFetchingNextPage}
                    size="small"
                    variant="secondary"
                    onClick={() => void channelsQuery.fetchNextPage()}
                  >
                    Load more
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  )
}

function DmListLoading() {
  return (
    <div className="rounded-panel border border-line bg-surface-raised px-5 py-8" role="status">
      <p className="text-sm font-medium text-muted">Loading conversations…</p>
    </div>
  )
}

function DmListError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="rounded-panel border border-negative/25 bg-negative/10 px-5 py-5" role="alert">
      <p className="text-sm font-medium text-negative">
        {getApiErrorMessage(error, 'Unable to load conversations. Please try again.')}
      </p>
      <Button className="mt-4" size="small" variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}

function DmListEmpty({ onOpenNewDm }: { onOpenNewDm?: () => void }) {
  return (
    <div className="rounded-panel border border-dashed border-line bg-surface-raised px-5 py-10 text-center">
      <span
        aria-hidden="true"
        className="mx-auto grid size-10 place-items-center rounded-control bg-brand-soft text-lg font-bold text-brand-text"
      >
        ✉
      </span>
      <h2 className="mt-4 text-sm font-semibold text-ink">No conversations yet</h2>
      <p className="mt-2 text-sm text-muted">Start a direct message and it will appear here.</p>
      <Button className="mt-5" size="small" onClick={onOpenNewDm}>
        New message
      </Button>
    </div>
  )
}
