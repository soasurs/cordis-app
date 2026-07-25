import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { GuildChannelType } from '@/api/guild'
import { Button } from '@/components/ui/button'
import { authSessionQueryOptions } from '@/features/auth/auth-session'
import { ChannelNavigation } from '@/features/guilds/components/channel-navigation'
import { CreateGuildChannelDialog } from '@/features/guilds/components/create-guild-channel-dialog'
import { GuildChannelHeader } from '@/features/guilds/components/guild-channel-header'
import {
  ChannelListSkeleton,
  ChannelLoadError,
  ChannelWelcome,
  EmptyGuild,
  PageLoading,
} from '@/features/guilds/components/guild-channel-states'
import { GuildPageHeader } from '@/features/guilds/components/guild-page-header'
import {
  guildChannelsQueryOptions,
  guildsQueryOptions,
  type GuildChannelSummary,
} from '@/features/guilds/guild-queries'
import { useChannelReordering } from '@/features/guilds/use-channel-reordering'

interface GuildPageProps {
  channelId?: string
  guildId: string
  onOpenSettings?: () => void
  onSelectChannel?: (channelId: string) => void
}

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
  // Settings are owner-gated for now; finer-grained manageGuild comes later.
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
      // Expanding the destination category so the dropped channel stays visible.
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
        <GuildPageHeader
          guildId={guildId}
          iconAssetId={guild?.iconAssetId ?? '0'}
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
        <GuildChannelHeader channel={selectedChannel} guildName={guild?.name ?? 'Community'} />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-5 py-7 sm:px-8 sm:py-10">
            <div className="mb-7 sm:hidden">
              <div className="flex items-center gap-3">
                <p className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-text">
                  Channels
                </p>
                {canManageGuild && onOpenSettings ? (
                  <Button
                    aria-label="Open community settings"
                    size="small"
                    variant="ghost"
                    onClick={onOpenSettings}
                  >
                    Settings
                  </Button>
                ) : null}
              </div>
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
            // Categories are not selectable destinations in the channel view.
            if (channel.type !== GuildChannelType.CATEGORY) onSelectChannel?.(channel.id)
          }}
        />
      ) : null}
    </main>
  )
}

function compareChannels(left: GuildChannelSummary, right: GuildChannelSummary) {
  return left.position - right.position || left.id.localeCompare(right.id)
}
