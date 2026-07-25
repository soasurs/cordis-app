import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'

import { getApiErrorMessage } from '@/api/errors'
import { GuildChannelType } from '@/api/guild'
import {
  moveGuildChannelInList,
  type GuildChannelMoveTarget,
} from '@/features/guilds/channel-ordering'
import {
  CategoryChannelGroup,
  ChannelDragPreview,
  RootChannelDropTarget,
  SortableChannelButton,
} from '@/features/guilds/components/channel-navigation-items'
import type { GuildChannelSummary } from '@/features/guilds/guild-queries'

interface ChannelNavigationProps {
  channels: GuildChannelSummary[]
  collapsedCategoryIds: Set<string>
  compact?: boolean
  moveError: Error | null
  movePending: boolean
  onCreateChannel: (category: GuildChannelSummary) => void
  onMoveChannel: (nextChannels: GuildChannelSummary[], parentId?: string) => void
  onSelectChannel?: (channelId: string) => void
  onToggleCategory: (categoryId: string) => void
  selectedChannelId?: string
}

interface DropVisual {
  overId?: string
  target?: GuildChannelMoveTarget
}

const hiddenDropVisual: DropVisual = {}

export function ChannelNavigation({
  channels,
  collapsedCategoryIds,
  compact = false,
  moveError,
  movePending,
  onCreateChannel,
  onMoveChannel,
  onSelectChannel,
  onToggleCategory,
  selectedChannelId,
}: ChannelNavigationProps) {
  const [activeChannel, setActiveChannel] = useState<GuildChannelSummary>()
  const [dropVisual, setDropVisual] = useState<DropVisual>({})
  const visibleDropVisual = activeChannel ? dropVisual : hiddenDropVisual
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const topLevelChannels = channels.filter(
    (channel) =>
      !channel.parentId &&
      (channel.type === GuildChannelType.CATEGORY ||
        channel.type === GuildChannelType.TEXT ||
        channel.type === GuildChannelType.VOICE),
  )

  if (topLevelChannels.length === 0) {
    return (
      <div
        className={`${compact ? 'mt-3' : ''} rounded-control border border-dashed border-line px-3 py-4`}
      >
        <p className="text-xs font-medium text-muted">No channels available</p>
      </div>
    )
  }

  const updateDropVisual = ({ active, over }: DragMoveEvent | DragOverEvent) => {
    const draggedChannel = getDragChannel(active.data.current)
    if (!draggedChannel || !over) {
      setDropVisual({})
      return
    }
    setDropVisual({
      overId: String(over.id),
      target: resolveDropTarget(channels, draggedChannel, active, over),
    })
  }
  const finishDrag = ({ active, over }: DragEndEvent) => {
    const draggedChannel = getDragChannel(active.data.current)
    const target =
      draggedChannel && over ? resolveDropTarget(channels, draggedChannel, active, over) : undefined
    clearDragState()
    if (!draggedChannel || !target || movePending) return

    const nextChannels = moveGuildChannelInList(channels, draggedChannel.id, target)
    if (nextChannels !== channels) {
      onMoveChannel(nextChannels, target.parentId)
    }
  }
  const clearDragState = () => {
    setActiveChannel(undefined)
    setDropVisual({})
  }

  return (
    <DndContext
      collisionDetection={closestCorners}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      sensors={sensors}
      onDragCancel={clearDragState}
      onDragEnd={finishDrag}
      onDragMove={updateDropVisual}
      onDragOver={updateDropVisual}
      onDragStart={({ active }: DragStartEvent) => {
        setActiveChannel(getDragChannel(active.data.current))
      }}
    >
      <nav
        aria-label="Community channels"
        aria-busy={movePending || undefined}
        className={compact ? 'relative mt-3 grid min-w-0 gap-2' : 'relative grid min-w-0 gap-2'}
      >
        {moveError ? (
          <p
            role="alert"
            className="rounded-control border border-negative/25 bg-negative/10 px-2.5 py-2 text-xs leading-5 text-negative"
          >
            {getApiErrorMessage(moveError, 'Unable to move this channel. Please try again.')}
          </p>
        ) : null}
        {activeChannel && activeChannel.type !== GuildChannelType.CATEGORY ? (
          <RootChannelDropTarget />
        ) : null}
        <SortableContext
          items={topLevelChannels.map((channel) => channel.id)}
          strategy={verticalListSortingStrategy}
        >
          {topLevelChannels.map((channel) =>
            channel.type === GuildChannelType.CATEGORY ? (
              <CategoryChannelGroup
                key={channel.id}
                category={channel}
                channels={channels.filter(
                  (child) =>
                    child.parentId === channel.id &&
                    (child.type === GuildChannelType.TEXT || child.type === GuildChannelType.VOICE),
                )}
                collapsed={collapsedCategoryIds.has(channel.id)}
                dropActive={Boolean(
                  activeChannel && activeChannel.type !== GuildChannelType.CATEGORY,
                )}
                dragDisabled={movePending}
                dropVisual={visibleDropVisual}
                onCreateChannel={onCreateChannel}
                onSelectChannel={onSelectChannel}
                onToggleCategory={onToggleCategory}
                selectedChannelId={selectedChannelId}
              />
            ) : (
              <SortableChannelButton
                key={channel.id}
                channel={channel}
                dragDisabled={movePending}
                dropVisual={visibleDropVisual}
                onSelectChannel={onSelectChannel}
                selected={channel.id === selectedChannelId}
              />
            ),
          )}
        </SortableContext>
      </nav>
      <DragOverlay dropAnimation={null}>
        {activeChannel ? <ChannelDragPreview channel={activeChannel} /> : null}
      </DragOverlay>
    </DndContext>
  )
}

function resolveDropTarget(
  channels: GuildChannelSummary[],
  draggedChannel: GuildChannelSummary,
  active: DragEndEvent['active'],
  over: NonNullable<DragEndEvent['over']>,
): GuildChannelMoveTarget | undefined {
  const overContainer = getDropContainer(over.data.current)
  if (overContainer) {
    if (overContainer.parentId) {
      return draggedChannel.type === GuildChannelType.CATEGORY
        ? undefined
        : { parentId: overContainer.parentId, placement: 'end' }
    }
    const firstTopLevelChannel = channels.find(
      (channel) => !channel.parentId && channel.id !== draggedChannel.id,
    )
    return firstTopLevelChannel
      ? { overChannelId: firstTopLevelChannel.id, placement: 'before' }
      : { placement: 'end' }
  }

  const overChannel = getDragChannel(over.data.current)
  if (!overChannel || overChannel.id === draggedChannel.id) return undefined
  if (
    draggedChannel.type !== GuildChannelType.CATEGORY &&
    overChannel.type === GuildChannelType.CATEGORY
  ) {
    return { parentId: overChannel.id, placement: 'end' }
  }
  return {
    overChannelId: overChannel.id,
    parentId: overChannel.parentId,
    placement: getDropPlacement(draggedChannel, overChannel, active, over),
  }
}

function getDragChannel(data: Record<string, unknown> | undefined) {
  if (data?.kind !== 'channel') return undefined
  return data.channel as GuildChannelSummary | undefined
}

function getDropContainer(data: Record<string, unknown> | undefined) {
  return data?.kind === 'container' ? (data as { kind: 'container'; parentId?: string }) : undefined
}

function getDropPlacement(
  activeChannel: GuildChannelSummary,
  overChannel: GuildChannelSummary,
  active: DragEndEvent['active'],
  over: NonNullable<DragEndEvent['over']>,
): 'after' | 'before' {
  const translatedTop = active.rect.current.translated?.top
  if (translatedTop !== undefined && translatedTop !== null) {
    return translatedTop > over.rect.top + over.rect.height / 2 ? 'after' : 'before'
  }
  return activeChannel.parentId === overChannel.parentId &&
    activeChannel.position < overChannel.position
    ? 'after'
    : 'before'
}
