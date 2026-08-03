import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import type { ReactNode } from 'react'
import { useMemo } from 'react'

import { getApiErrorMessage } from '@/api/errors'
import type { GatewayStatus } from '@/app/gateway-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DmChannelRow } from '@/features/dm/components/dm-channel-row'
import { dmChannelsInfiniteQueryOptions, flattenDmChannels } from '@/features/dm/dm-queries'
import { useMergeDmReadStates } from '@/features/dm/use-dm-read-states'
import { FriendRelationshipRow } from '@/features/friends/components/friend-relationship-row'
import {
  flattenRelationships,
  relationshipListInfiniteQueryOptions,
} from '@/features/friends/relationship-queries'
import { GuildIcon } from '@/features/guilds/components/guild-icon'
import { guildsQueryOptions } from '@/features/guilds/guild-queries'
import { isChannelUnread, useChannelReadStates } from '@/features/messages/read-state-queries'
import { useCreateDmDialog } from '@/stores/create-dm-dialog'
import { useCreateGuildDialog } from '@/stores/create-guild-dialog'
import { useJoinGuildInviteDialog } from '@/stores/join-guild-invite-dialog'

interface HomePageProps {
  displayName: string
  gatewayStatus?: GatewayStatus
  onSelectDm?: (channelId: string) => void
  onSelectGuild?: (guildId: string) => void
  onViewAllDm?: () => void
  onViewPendingRequests?: () => void
}

const recentDmLimit = 5
const pendingRequestLimit = 5

function getFirstName(displayName: string) {
  return displayName.trim().split(/\s+/)[0] || 'there'
}

export function HomePage({
  displayName,
  gatewayStatus = { errorCode: null, state: 'idle' },
  onSelectDm,
  onSelectGuild,
  onViewAllDm,
  onViewPendingRequests,
}: HomePageProps) {
  const realtimeStatus = getRealtimeStatus(gatewayStatus)
  const openCreateGuildDialog = useCreateGuildDialog((state) => state.open)
  const openJoinGuildInviteDialog = useJoinGuildInviteDialog((state) => state.open)
  const openCreateDmDialog = useCreateDmDialog((state) => state.open)

  const channelsQuery = useInfiniteQuery(dmChannelsInfiniteQueryOptions())
  useMergeDmReadStates(channelsQuery.data)
  const { data: readStates = {} } = useChannelReadStates()
  const channels = flattenDmChannels(channelsQuery.data)
  const unreadCount = useMemo(
    () => Object.values(readStates).filter(isChannelUnread).length,
    [readStates],
  )

  const incomingQuery = useInfiniteQuery(relationshipListInfiniteQueryOptions('incoming'))
  const incoming = flattenRelationships(incomingQuery.data)
  const { data: guilds = [] } = useQuery(guildsQueryOptions)

  const showFirstSteps = channels.length === 0 && incoming.length === 0 && guilds.length === 0

  return (
    <main className="flex min-h-0 flex-1 flex-col bg-canvas">
      <header className="hidden h-16 shrink-0 items-center gap-4 border-b border-line bg-surface/85 px-6 backdrop-blur md:flex">
        <div>
          <h2 className="text-sm font-semibold text-ink">Home</h2>
          <p className="mt-0.5 text-xs text-subtle">
            Your conversations and communities at a glance
          </p>
        </div>
        <button
          type="button"
          disabled
          className="ml-auto flex h-9 w-full max-w-64 items-center gap-2 rounded-control border border-line bg-surface-raised px-3 text-left text-xs text-subtle disabled:cursor-not-allowed"
        >
          <span aria-hidden="true">⌕</span>
          Search Cordis
          <span className="ml-auto rounded border border-line px-1.5 py-0.5 text-[0.6rem]">/</span>
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto xl:overflow-visible">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-5 pt-7 pb-8 sm:px-7 xl:h-full xl:grid-cols-[minmax(0,1fr)_17rem] xl:pb-0">
          <div className="min-w-0 xl:flex xl:min-h-0 xl:flex-col">
            <section className="xl:shrink-0">
              <Badge tone="brand">Cordis Home</Badge>
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-ink sm:text-4xl">
                Welcome, {getFirstName(displayName)}.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
                Your conversations, requests, and communities in one place.
              </p>
              <div className="mt-6 grid max-w-2xl gap-3 sm:grid-cols-3">
                <OverviewStat label="Unread conversations" value={unreadCount} />
                <OverviewStat label="Friend requests" value={incoming.length} />
                <OverviewStat label="Communities" value={guilds.length} />
              </div>
            </section>
            <ScrollArea.Root className="mt-8 overflow-hidden xl:mt-0 xl:min-h-0 xl:flex-1">
              <ScrollArea.Viewport className="size-full">
                <div className="space-y-8 xl:pt-6 xl:pb-8">
                  {showFirstSteps ? (
                    <FirstSteps
                      onCreateCommunity={openCreateGuildDialog}
                      onJoinInvite={() => openJoinGuildInviteDialog()}
                      onNewMessage={openCreateDmDialog}
                    />
                  ) : null}

                  <section aria-labelledby="recent-heading">
                    <SectionHeading
                      action={
                        channels.length > recentDmLimit ? (
                          <Button size="small" variant="ghost" onClick={onViewAllDm}>
                            View all
                          </Button>
                        ) : undefined
                      }
                      eyebrow="Conversations"
                      id="recent-heading"
                      title="Continue where you left off"
                    />
                    <div className="mt-4">
                      {channelsQuery.isPending ? (
                        <PanelLoading label="Loading conversations…" />
                      ) : null}
                      {channelsQuery.isError ? (
                        <PanelError
                          error={channelsQuery.error}
                          fallback="Unable to load conversations."
                          onRetry={() => void channelsQuery.refetch()}
                        />
                      ) : null}
                      {channelsQuery.isSuccess && channels.length === 0 ? (
                        <EmptyPanel
                          action={
                            <Button size="small" onClick={openCreateDmDialog}>
                              New message
                            </Button>
                          }
                          copy="Message a friend or join a community and your latest conversations will be waiting here."
                          mark="✉"
                          title="No recent conversations"
                        />
                      ) : null}
                      {channelsQuery.isSuccess && channels.length > 0 ? (
                        <ul className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface-raised shadow-panel">
                          {channels.slice(0, recentDmLimit).map((channel) => (
                            <DmChannelRow
                              key={channel.channelId}
                              channel={channel}
                              readState={readStates[channel.channelId]}
                              onSelect={onSelectDm}
                            />
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </section>

                  <section aria-labelledby="attention-heading">
                    <SectionHeading
                      action={
                        incoming.length > pendingRequestLimit ? (
                          <Button size="small" variant="ghost" onClick={onViewPendingRequests}>
                            View all
                          </Button>
                        ) : undefined
                      }
                      eyebrow="Inbox"
                      id="attention-heading"
                      title="Needs your attention"
                    />
                    <div className="mt-4">
                      {incomingQuery.isPending ? (
                        <PanelLoading label="Loading friend requests…" />
                      ) : null}
                      {incomingQuery.isError ? (
                        <PanelError
                          error={incomingQuery.error}
                          fallback="Unable to load friend requests."
                          onRetry={() => void incomingQuery.refetch()}
                        />
                      ) : null}
                      {incomingQuery.isSuccess && incoming.length === 0 ? (
                        <div className="rounded-panel border border-dashed border-line-strong bg-surface/55 px-6 py-7 text-center">
                          <span className="grid size-10 place-items-center rounded-full border border-line bg-surface text-lg text-subtle">
                            ✓
                          </span>
                          <h3 className="mt-4 text-sm font-semibold text-ink">All clear</h3>
                          <p className="mt-2 text-xs leading-5 text-muted">
                            Friend requests that need action will appear here.
                          </p>
                        </div>
                      ) : null}
                      {incomingQuery.isSuccess && incoming.length > 0 ? (
                        <ul className="overflow-hidden rounded-panel border border-line bg-surface-raised shadow-panel">
                          {incoming.slice(0, pendingRequestLimit).map((relationship) => (
                            <FriendRelationshipRow
                              key={relationship.targetId}
                              relationship={relationship}
                            />
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </section>

                  <section aria-labelledby="guilds-heading">
                    <SectionHeading
                      eyebrow="Communities"
                      id="guilds-heading"
                      title="Your communities"
                    />
                    <div className="mt-4">
                      {guilds.length === 0 ? (
                        <EmptyPanel
                          action={
                            <div className="flex flex-wrap justify-center gap-2">
                              <Button size="small" onClick={openCreateGuildDialog}>
                                Create community
                              </Button>
                              <Button
                                size="small"
                                variant="secondary"
                                onClick={() => openJoinGuildInviteDialog()}
                              >
                                Enter invite code
                              </Button>
                            </div>
                          }
                          copy="Create a focused space for your group or join one with an invite code."
                          mark="◈"
                          title="No communities yet"
                        />
                      ) : (
                        <ul className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface-raised shadow-panel">
                          {guilds.map((guild) => (
                            <li key={guild.id}>
                              <button
                                type="button"
                                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 disabled:cursor-not-allowed"
                                disabled={!onSelectGuild}
                                onClick={() => onSelectGuild?.(guild.id)}
                              >
                                <GuildIcon
                                  className="rounded-control"
                                  guildId={guild.id}
                                  iconAssetId={guild.iconAssetId}
                                  name={guild.name}
                                  size="header"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-semibold text-ink">
                                    {guild.name}
                                  </span>
                                  {guild.description ? (
                                    <span className="mt-0.5 block truncate text-xs text-subtle">
                                      {guild.description}
                                    </span>
                                  ) : null}
                                </span>
                                <span aria-hidden="true" className="text-subtle">
                                  ›
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </section>
                </div>
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar orientation="vertical" className="flex w-2 p-0.5">
                <ScrollArea.Thumb className="flex-1 rounded-full bg-line-strong" />
              </ScrollArea.Scrollbar>
            </ScrollArea.Root>
          </div>
          <aside className="xl:pt-1" aria-label="Home details">
            <RealtimeStatusCard realtimeStatus={realtimeStatus} />
          </aside>
        </div>
      </div>
    </main>
  )
}

function FirstSteps({
  onCreateCommunity,
  onJoinInvite,
  onNewMessage,
}: {
  onCreateCommunity: () => void
  onJoinInvite: () => void
  onNewMessage: () => void
}) {
  const steps = [
    {
      action: onCreateCommunity,
      copy: 'Start a focused space for your team, group, or community.',
      label: 'Create community',
      mark: '+',
      title: 'Create a community',
    },
    {
      action: onJoinInvite,
      copy: 'Use an invite code to enter a community you already know.',
      label: 'Enter invite code',
      mark: '↗',
      title: 'Join with an invite',
    },
    {
      action: onNewMessage,
      copy: 'Search by username and begin a private conversation.',
      label: 'New message',
      mark: '@',
      title: 'Message a friend',
    },
  ]

  return (
    <section aria-labelledby="start-heading">
      <SectionHeading eyebrow="First steps" id="start-heading" title="Start connecting" />
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {steps.map((item) => (
          <article
            key={item.title}
            className="rounded-panel border border-line bg-surface p-4 shadow-panel"
          >
            <span className="grid size-9 place-items-center rounded-control bg-brand-soft text-base font-bold text-brand-text">
              {item.mark}
            </span>
            <h3 className="mt-5 text-sm font-semibold text-ink">{item.title}</h3>
            <p className="mt-2 text-xs leading-5 text-muted">{item.copy}</p>
            <Button className="mt-5 w-full" size="small" variant="secondary" onClick={item.action}>
              {item.label}
            </Button>
          </article>
        ))}
      </div>
    </section>
  )
}

function SectionHeading({
  action,
  eyebrow,
  id,
  title,
}: {
  action?: ReactNode
  eyebrow: string
  id: string
  title: string
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-subtle">{eyebrow}</p>
        <h2 id={id} className="mt-2 text-lg font-semibold text-ink">
          {title}
        </h2>
      </div>
      {action}
    </div>
  )
}

function OverviewStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-panel border border-line bg-surface px-4 py-3 shadow-panel">
      <p className="text-2xl font-semibold tracking-[-0.02em] text-ink">{value}</p>
      <p className="mt-1 text-xs text-subtle">{label}</p>
    </div>
  )
}

function RealtimeStatusCard({
  realtimeStatus,
}: {
  realtimeStatus: ReturnType<typeof getRealtimeStatus>
}) {
  return (
    <section className="rounded-panel border border-line bg-surface p-4 shadow-panel">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">Realtime connection</h2>
        <Badge dot tone={realtimeStatus.tone}>
          {realtimeStatus.label}
        </Badge>
      </div>
      <div className="mt-5 rounded-control bg-surface-raised px-3 py-4">
        <p className="text-xs leading-5 text-muted">{realtimeStatus.copy}</p>
      </div>
    </section>
  )
}

function PanelLoading({ label }: { label: string }) {
  return (
    <div className="rounded-panel border border-line bg-surface-raised px-5 py-8" role="status">
      <p className="text-sm font-medium text-muted">{label}</p>
    </div>
  )
}

function PanelError({
  error,
  fallback,
  onRetry,
}: {
  error: Error
  fallback: string
  onRetry: () => void
}) {
  return (
    <div className="rounded-panel border border-negative/25 bg-negative/10 px-5 py-5" role="alert">
      <p className="text-sm font-medium text-negative">{getApiErrorMessage(error, fallback)}</p>
      <Button className="mt-4" size="small" variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}

function EmptyPanel({
  action,
  copy,
  mark,
  title,
}: {
  action?: ReactNode
  copy: string
  mark: string
  title: string
}) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center rounded-panel border border-dashed border-line-strong bg-surface/55 px-6 py-8 text-center">
      <span className="grid size-10 place-items-center rounded-full border border-line bg-surface text-lg text-subtle">
        {mark}
      </span>
      <h3 className="mt-4 text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-2 max-w-md text-xs leading-5 text-muted">{copy}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

function getRealtimeStatus(status: GatewayStatus): {
  copy: string
  label: string
  tone: 'danger' | 'neutral' | 'success' | 'warning'
} {
  if (status.errorCode === 'configuration_error') {
    return {
      copy: 'Realtime is unavailable. Check the VITE_GATEWAY_URL configuration.',
      label: 'Unavailable',
      tone: 'danger',
    }
  }

  switch (status.state) {
    case 'connecting':
      return {
        copy: 'Opening a secure realtime connection to Cordis.',
        label: 'Connecting',
        tone: 'warning',
      }
    case 'reconnecting':
      return {
        copy: 'The connection was interrupted. Cordis is retrying automatically.',
        label: 'Reconnecting',
        tone: 'warning',
      }
    case 'ready':
      return {
        copy: 'Live updates are connected and ready to receive events.',
        label: 'Connected',
        tone: 'success',
      }
    case 'idle':
      return {
        copy: status.errorCode
          ? 'Realtime is temporarily offline. Cordis will reconnect when possible.'
          : 'Realtime updates are currently offline.',
        label: 'Offline',
        tone: 'neutral',
      }
  }
}
