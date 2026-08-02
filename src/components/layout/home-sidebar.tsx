import * as ScrollArea from '@radix-ui/react-scroll-area'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import type { GatewayStatus } from '@/app/gateway-context'
import type { AppUserSummary } from '@/components/layout/app-shell-types'
import { CurrentUserPanel } from '@/components/layout/current-user-panel'
import { PersonalNavigation } from '@/components/layout/personal-navigation'
import { DmChannelRow } from '@/features/dm/components/dm-channel-row'
import { dmChannelsInfiniteQueryOptions, flattenDmChannels } from '@/features/dm/dm-queries'
import { useMergeDmReadStates } from '@/features/dm/use-dm-read-states'
import { useResolvePresenceBatches } from '@/features/presence/presence-queries'
import { useChannelReadStates } from '@/features/messages/read-state-queries'

export function HomeSidebar({
  activeDmChannelId,
  activeSection,
  gatewayStatus,
  onOpenNewDm,
  onOpenUserSettings,
  onSelectDm,
  onSelectFriends,
  onSelectHome,
  user,
}: {
  activeDmChannelId?: string
  activeSection: 'dm' | 'friends' | 'home'
  gatewayStatus: GatewayStatus
  onOpenNewDm?: () => void
  onOpenUserSettings?: () => void
  onSelectDm?: (channelId?: string) => void
  onSelectFriends?: () => void
  onSelectHome?: () => void
  user: AppUserSummary
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
    <aside className="hidden w-60 shrink-0 border-r border-line bg-surface-raised lg:flex lg:flex-col">
      <header className="flex h-16 shrink-0 items-center border-b border-line px-5">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-brand-text">
            Personal space
          </p>
          <h1 className="mt-1 text-sm font-semibold text-ink">Cordis Home</h1>
        </div>
      </header>

      <ScrollArea.Root className="min-h-0 flex-1 overflow-hidden">
        <ScrollArea.Viewport className="size-full px-3 py-4">
          <PersonalNavigation
            activeSection={activeSection}
            onSelectDm={() => onSelectDm?.()}
            onSelectFriends={onSelectFriends}
            onSelectHome={onSelectHome}
          />

          <div className="mt-8 flex items-center justify-between px-3">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-subtle">
              Direct messages
            </p>
            <button
              type="button"
              aria-label="Start a direct message"
              className="text-lg leading-none text-subtle transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 disabled:cursor-not-allowed"
              disabled={!onOpenNewDm}
              onClick={onOpenNewDm}
            >
              +
            </button>
          </div>
          <div className="mt-3">
            {channelsQuery.isPending ? (
              <p className="px-3 text-xs text-muted" role="status">
                Loading conversations…
              </p>
            ) : null}
            {channelsQuery.isError ? (
              <div className="rounded-panel border border-negative/25 bg-negative/10 px-3 py-3">
                <p className="text-xs leading-5 text-negative">Unable to load messages.</p>
                <button
                  type="button"
                  className="mt-2 text-xs font-semibold text-brand-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70"
                  onClick={() => void channelsQuery.refetch()}
                >
                  Try again
                </button>
              </div>
            ) : null}
            {channelsQuery.isSuccess && channels.length === 0 ? (
              <div className="rounded-panel border border-dashed border-line px-3 py-4">
                <p className="text-xs font-medium text-muted">No conversations yet</p>
                <p className="mt-1 text-xs leading-5 text-subtle">
                  Your recent direct messages will appear here.
                </p>
              </div>
            ) : null}
            {channelsQuery.isSuccess && channels.length > 0 ? (
              <ul className="grid gap-0.5">
                {channels.map((channel) => (
                  <DmChannelRow
                    key={channel.channelId}
                    active={channel.channelId === activeDmChannelId}
                    channel={channel}
                    readState={readStates[channel.channelId]}
                    onSelect={onSelectDm}
                  />
                ))}
              </ul>
            ) : null}
          </div>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical" className="flex w-2 p-0.5">
          <ScrollArea.Thumb className="flex-1 rounded-full bg-line-strong" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>

      <CurrentUserPanel
        gatewayStatus={gatewayStatus}
        user={user}
        onOpenUserSettings={onOpenUserSettings}
      />
    </aside>
  )
}
