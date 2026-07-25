import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { getApiErrorMessage } from '@/api/errors'
import { authSessionQueryOptions } from '@/features/auth/auth-session'

import { ChannelNavigation } from '../components/channel-navigation'
import { TextChannelIcon, VoiceChannelIcon } from '../components/channel-icons'
import { CreateGuildChannelDialog } from '../components/create-guild-channel-dialog'
import {
  guildChannelsQueryOptions,
  guildsQueryOptions,
  type GuildChannelSummary,
} from '../guild-queries'
import { useChannelReordering } from '../use-channel-reordering'

interface GuildPageProps {
  channelId?: string
  guildId: string
  onOpenSettings?: () => void
  onSelectChannel?: (channelId: string) => void
}

const channelType = {
  category: 2,
  text: 1,
  voice: 3,
} as const

type CreateChannelTarget =
  { kind: 'category' } | { kind: 'channel'; parentCategory?: GuildChannelSummary }

export function GuildPage({ channelId, guildId, onOpenSettings, onSelectChannel }: GuildPageProps) {
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState<Set<string>>(() => new Set())
  const [createChannelTarget, setCreateChannelTarget] = useState<CreateChannelTarget>()
  const { data: session } = useQuery(authSessionQueryOptions)
  const { data: guilds } = useQuery(guildsQueryOptions)
  const channelsQuery = useQuery(guildChannelsQueryOptions(guildId))
  const channelReordering = useChannelReordering(guildId)
  const guild = guilds?.find((item) => item.id === guildId)
  const canManageGuild = guild?.ownerId === session?.user.userId.toString()
  const channels = [...(channelsQuery.data ?? [])].sort(compareChannels)
  const selectedChannel = channels.find((channel) => channel.id === channelId)
  const toggleCategory = (categoryId: string) => {
    setCollapsedCategoryIds((current) => {
      const next = new Set(current)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }
  const moveChannel = (nextChannels: GuildChannelSummary[], parentId?: string) => {
    if (parentId) {
      setCollapsedCategoryIds((current) => {
        const next = new Set(current)
        next.delete(parentId)
        return next
      })
    }
    channelReordering.mutate({
      nextChannels,
      previousChannels: channels,
    })
  }

  return (
    <main className="flex min-h-0 flex-1 bg-surface">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface-raised sm:flex">
        <GuildHeader
          name={guild?.name ?? 'Community'}
          onCreateCategory={() => setCreateChannelTarget({ kind: 'category' })}
          onCreateChannel={() => setCreateChannelTarget({ kind: 'channel' })}
          onOpenSettings={canManageGuild ? onOpenSettings : undefined}
        />
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2 py-3">
          {channelsQuery.isPending ? <ChannelListSkeleton /> : null}
          {channelsQuery.isError ? (
            <ChannelLoadError
              error={channelsQuery.error}
              onRetry={() => void channelsQuery.refetch()}
            />
          ) : null}
          {channelsQuery.isSuccess ? (
            <ChannelNavigation
              channels={channels}
              collapsedCategoryIds={collapsedCategoryIds}
              moveError={channelReordering.error}
              movePending={channelReordering.isPending}
              selectedChannelId={selectedChannel?.id}
              onCreateChannel={(parentCategory) =>
                setCreateChannelTarget({ kind: 'channel', parentCategory })
              }
              onMoveChannel={moveChannel}
              onSelectChannel={onSelectChannel}
              onToggleCategory={toggleCategory}
            />
          ) : null}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-surface">
        <ChannelHeader channel={selectedChannel} guildName={guild?.name ?? 'Community'} />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-5 py-7 sm:px-8 sm:py-10">
            <div className="mb-7 sm:hidden">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-text">
                Channels
              </p>
              {channelsQuery.isPending ? <ChannelListSkeleton /> : null}
              {channelsQuery.isError ? (
                <ChannelLoadError
                  error={channelsQuery.error}
                  onRetry={() => void channelsQuery.refetch()}
                />
              ) : null}
              {channelsQuery.isSuccess ? (
                <ChannelNavigation
                  channels={channels}
                  compact
                  collapsedCategoryIds={collapsedCategoryIds}
                  moveError={channelReordering.error}
                  movePending={channelReordering.isPending}
                  selectedChannelId={selectedChannel?.id}
                  onCreateChannel={(parentCategory) =>
                    setCreateChannelTarget({ kind: 'channel', parentCategory })
                  }
                  onMoveChannel={moveChannel}
                  onSelectChannel={onSelectChannel}
                  onToggleCategory={toggleCategory}
                />
              ) : null}
            </div>

            {channelsQuery.isSuccess && selectedChannel ? (
              <ChannelWelcome channel={selectedChannel} />
            ) : null}
            {channelsQuery.isSuccess && !selectedChannel ? <EmptyGuild /> : null}
            {channelsQuery.isPending ? <PageLoading /> : null}
          </div>
        </div>
      </section>

      {createChannelTarget ? (
        <CreateGuildChannelDialog
          guildId={guildId}
          guildName={guild?.name ?? 'Community'}
          kind={createChannelTarget.kind}
          parentCategory={
            createChannelTarget.kind === 'channel' ? createChannelTarget.parentCategory : undefined
          }
          onClose={() => setCreateChannelTarget(undefined)}
          onCreated={(channel) => {
            if (createChannelTarget.kind === 'channel' && createChannelTarget.parentCategory) {
              const categoryId = createChannelTarget.parentCategory.id
              setCollapsedCategoryIds((current) => {
                const next = new Set(current)
                next.delete(categoryId)
                return next
              })
            }
            setCreateChannelTarget(undefined)
            if (channel.type !== channelType.category) onSelectChannel?.(channel.id)
          }}
        />
      ) : null}
    </main>
  )
}

function GuildHeader({
  name,
  onCreateCategory,
  onCreateChannel,
  onOpenSettings,
}: {
  name: string
  onCreateCategory: () => void
  onCreateChannel: () => void
  onOpenSettings?: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="relative flex h-16 shrink-0 items-center border-b border-line px-4">
      <div className="min-w-0">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-brand-text">
          Community
        </p>
        <h1 className="mt-1 truncate text-sm font-semibold text-ink">{name}</h1>
      </div>
      <div
        className="ml-auto"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setMenuOpen(false)
            event.currentTarget.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')?.focus()
          }
        }}
      >
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label="Community menu"
          className="grid size-8 place-items-center rounded-control text-base tracking-[0.12em] text-subtle transition hover:bg-surface-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70"
          onClick={() => setMenuOpen((open) => !open)}
        >
          ···
        </button>
        {menuOpen ? (
          <div
            role="menu"
            aria-label="Community actions"
            className="absolute top-14 right-3 z-30 grid w-52 gap-1 rounded-panel border border-line bg-surface-raised p-1.5 shadow-panel"
          >
            {onOpenSettings ? (
              <>
                <button
                  type="button"
                  role="menuitem"
                  className="whitespace-nowrap rounded-control px-3 py-2 text-left text-sm font-medium text-ink transition hover:bg-surface-hover focus:bg-surface-hover focus:outline-none"
                  onClick={() => {
                    setMenuOpen(false)
                    onOpenSettings()
                  }}
                >
                  Community settings
                </button>
                <div role="separator" className="my-0.5 h-px bg-line" />
              </>
            ) : null}
            <button
              type="button"
              role="menuitem"
              className="whitespace-nowrap rounded-control px-3 py-2 text-left text-sm font-medium text-ink transition hover:bg-surface-hover focus:bg-surface-hover focus:outline-none"
              onClick={() => {
                setMenuOpen(false)
                onCreateChannel()
              }}
            >
              Create channel
            </button>
            <button
              type="button"
              role="menuitem"
              className="whitespace-nowrap rounded-control px-3 py-2 text-left text-sm font-medium text-ink transition hover:bg-surface-hover focus:bg-surface-hover focus:outline-none"
              onClick={() => {
                setMenuOpen(false)
                onCreateCategory()
              }}
            >
              Create category
            </button>
          </div>
        ) : null}
      </div>
    </header>
  )
}

function ChannelHeader({
  channel,
  guildName,
}: {
  channel?: GuildChannelSummary
  guildName: string
}) {
  return (
    <header className="hidden h-16 shrink-0 items-center gap-3 border-b border-line bg-surface/90 px-5 backdrop-blur sm:flex">
      <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center text-subtle">
        {channel?.type === channelType.voice ? <VoiceChannelIcon /> : <TextChannelIcon />}
      </span>
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold text-ink">{channel?.name ?? guildName}</h2>
        <p className="mt-0.5 truncate text-xs text-subtle">
          {channel?.topic || 'Your community is ready.'}
        </p>
      </div>
    </header>
  )
}

function ChannelWelcome({ channel }: { channel: GuildChannelSummary }) {
  const isVoiceChannel = channel.type === channelType.voice
  return (
    <div className="mt-auto rounded-shell border border-line bg-surface-raised p-6 shadow-panel sm:p-8">
      <span className="grid size-11 place-items-center rounded-panel bg-brand-soft text-xl font-bold text-brand-text">
        {isVoiceChannel ? (
          <VoiceChannelIcon className="size-5" />
        ) : (
          <TextChannelIcon className="size-5" />
        )}
      </span>
      <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-ink">
        Welcome to {isVoiceChannel ? '' : '#'}
        {channel.name}
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
        {channel.topic || 'This is the beginning of this channel. Message history comes next.'}
      </p>
    </div>
  )
}

function EmptyGuild() {
  return (
    <div className="m-auto max-w-md text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full border border-line bg-surface-raised text-xl text-subtle">
        #
      </span>
      <h2 className="mt-5 text-lg font-semibold text-ink">No channels yet</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Cordis could not find a channel in this community. Channel management is coming next.
      </p>
    </div>
  )
}

function ChannelLoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div role="alert" className="mt-3 rounded-control border border-negative/25 bg-negative/10 p-3">
      <p className="text-xs leading-5 text-negative">
        {getApiErrorMessage(error, 'Unable to load channels. Please try again.')}
      </p>
      <Button className="mt-3" size="small" variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}

function ChannelListSkeleton() {
  return (
    <div aria-label="Loading channels" className="mt-3 grid gap-2 px-2">
      <span className="h-3 w-20 animate-pulse rounded bg-line" />
      <span className="h-9 animate-pulse rounded-control bg-surface-hover" />
      <span className="h-9 animate-pulse rounded-control bg-surface-hover" />
    </div>
  )
}

function PageLoading() {
  return (
    <div className="m-auto flex items-center gap-3 text-sm font-medium text-muted">
      <span className="size-4 animate-spin rounded-full border-2 border-brand border-r-transparent" />
      Preparing your community
    </div>
  )
}

function compareChannels(left: GuildChannelSummary, right: GuildChannelSummary) {
  return left.position - right.position || left.id.localeCompare(right.id)
}
