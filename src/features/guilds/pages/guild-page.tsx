import { useState } from 'react'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import { GuildChannelType } from '@/api/guild'
import { Button } from '@/components/ui/button'
import { ChannelNavigation } from '@/features/guilds/components/channel-navigation'
import { CreateGuildChannelDialog } from '@/features/guilds/components/create-guild-channel-dialog'
import { GuildChannelHeader } from '@/features/guilds/components/guild-channel-header'
import {
  ChannelListSkeleton,
  ChannelLoadError,
  ChannelWelcome,
  PageLoading,
} from '@/features/guilds/components/guild-channel-states'
import { GuildPageHeader } from '@/features/guilds/components/guild-page-header'
import {
  guildChannelsQueryOptions,
  guildsQueryOptions,
  type GuildChannelSummary,
} from '@/features/guilds/guild-queries'
import { useChannelReordering } from '@/features/guilds/use-channel-reordering'
import { useGuildCapabilities } from '@/features/guilds/use-guild-permissions'
import { TextChannelView } from '@/features/messages/components/text-channel-view'

interface GuildPageProps {
  channelId?: string
  guildId: string
  onOpenChannelSettings?: (channel: GuildChannelSummary) => void
  onOpenSettings?: () => void
  onSelectChannel?: (channelId: string) => void
}

type CreateChannelTarget =
  { kind: 'category' } | { kind: 'channel'; parentCategory?: GuildChannelSummary }

export function GuildPage({
  channelId,
  guildId,
  onOpenChannelSettings,
  onOpenSettings,
  onSelectChannel,
}: GuildPageProps) {
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState<Set<string>>(() => new Set())
  const [createChannelTarget, setCreateChannelTarget] = useState<CreateChannelTarget>()
  const { data: guilds } = useQuery(guildsQueryOptions)
  const channelsQuery = useQuery(guildChannelsQueryOptions(guildId))
  const channelReordering = useChannelReordering(guildId)
  const { can } = useGuildCapabilities(guildId)
  const canManageChannels = can('manageChannels')
  const canOpenSettings = can('openGuildSettings')
  const canSendMessages = can('sendMessages')
  const guild = guilds?.find((item) => item.id === guildId)
  const channels = [...(channelsQuery.data ?? [])].sort(compareChannels)
  const selectedChannel = channels.find((channel) => channel.id === channelId)
  const isTextChannel = selectedChannel?.type === GuildChannelType.TEXT
  const toggleCategory = (categoryId: string) => {
    setCollapsedCategoryIds((current) => {
      const next = new Set(current)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }
  const moveChannel = (nextChannels: GuildChannelSummary[], parentId?: string) => {
    if (!canManageChannels) return
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

  const mobileChannelList = (
    <MobileChannelList
      canManageChannels={canManageChannels}
      canOpenSettings={canOpenSettings}
      channels={channels}
      channelsQuery={channelsQuery}
      collapsedCategoryIds={collapsedCategoryIds}
      moveError={channelReordering.error}
      movePending={channelReordering.isPending}
      selectedChannelId={selectedChannel?.id}
      onCreateChannel={(parentCategory) =>
        setCreateChannelTarget({ kind: 'channel', parentCategory })
      }
      onMoveChannel={moveChannel}
      onOpenChannelSettings={onOpenChannelSettings}
      onOpenSettings={onOpenSettings}
      onSelectChannel={onSelectChannel}
      onToggleCategory={toggleCategory}
    />
  )

  return (
    <main className="flex min-h-0 flex-1 bg-surface">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface-raised sm:flex">
        <GuildPageHeader
          guildId={guildId}
          iconAssetId={guild?.iconAssetId ?? '0'}
          name={guild?.name ?? 'Community'}
          onCreateCategory={
            canManageChannels ? () => setCreateChannelTarget({ kind: 'category' }) : undefined
          }
          onCreateChannel={
            canManageChannels ? () => setCreateChannelTarget({ kind: 'channel' }) : undefined
          }
          onOpenSettings={canOpenSettings ? onOpenSettings : undefined}
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
              reorderEnabled={canManageChannels}
              selectedChannelId={selectedChannel?.id}
              onCreateChannel={
                canManageChannels
                  ? (parentCategory) => setCreateChannelTarget({ kind: 'channel', parentCategory })
                  : undefined
              }
              onMoveChannel={moveChannel}
              onOpenChannelSettings={canManageChannels ? onOpenChannelSettings : undefined}
              onSelectChannel={onSelectChannel}
              onToggleCategory={toggleCategory}
            />
          ) : null}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-surface">
        <GuildChannelHeader channel={selectedChannel} guildName={guild?.name ?? 'Community'} />
        {isTextChannel && selectedChannel ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="border-b border-line px-5 py-4 sm:hidden">{mobileChannelList}</div>
            <TextChannelView canSend={canSendMessages} channel={selectedChannel} />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-5 py-7 sm:px-8 sm:py-10">
              <div className="mb-7 sm:hidden">{mobileChannelList}</div>
              {channelsQuery.isSuccess && selectedChannel ? (
                <ChannelWelcome channel={selectedChannel} />
              ) : null}
              {channelsQuery.isPending ? <PageLoading /> : null}
            </div>
          </div>
        )}
      </section>

      {canManageChannels && createChannelTarget ? (
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

function MobileChannelList({
  canManageChannels,
  canOpenSettings,
  channels,
  channelsQuery,
  collapsedCategoryIds,
  moveError,
  movePending,
  onCreateChannel,
  onMoveChannel,
  onOpenChannelSettings,
  onOpenSettings,
  onSelectChannel,
  onToggleCategory,
  selectedChannelId,
}: {
  canManageChannels: boolean
  canOpenSettings: boolean
  channels: GuildChannelSummary[]
  channelsQuery: UseQueryResult<GuildChannelSummary[]>
  collapsedCategoryIds: Set<string>
  moveError: Error | null
  movePending: boolean
  onCreateChannel: (parentCategory?: GuildChannelSummary) => void
  onMoveChannel: (nextChannels: GuildChannelSummary[], parentId?: string) => void
  onOpenChannelSettings?: (channel: GuildChannelSummary) => void
  onOpenSettings?: () => void
  onSelectChannel?: (channelId: string) => void
  onToggleCategory: (categoryId: string) => void
  selectedChannelId?: string
}) {
  return (
    <>
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-text">
          Channels
        </p>
        {canOpenSettings && onOpenSettings ? (
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
          moveError={moveError}
          movePending={movePending}
          reorderEnabled={canManageChannels}
          selectedChannelId={selectedChannelId}
          onCreateChannel={canManageChannels ? onCreateChannel : undefined}
          onMoveChannel={onMoveChannel}
          onOpenChannelSettings={canManageChannels ? onOpenChannelSettings : undefined}
          onSelectChannel={onSelectChannel}
          onToggleCategory={onToggleCategory}
        />
      ) : null}
    </>
  )
}

function compareChannels(left: GuildChannelSummary, right: GuildChannelSummary) {
  return left.position - right.position || left.id.localeCompare(right.id)
}
