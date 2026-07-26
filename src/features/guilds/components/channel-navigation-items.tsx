import {
  useDroppable,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'

import { GuildChannelType } from '@/api/guild'
import type { GuildChannelMoveTarget } from '@/features/guilds/channel-ordering'
import {
  ChevronIcon,
  DragHandleIcon,
  SettingsGearIcon,
  TextChannelIcon,
  VoiceChannelIcon,
} from '@/features/guilds/components/channel-icons'
import type { GuildChannelSummary } from '@/features/guilds/guild-queries'

interface DropVisual {
  overId?: string
  target?: GuildChannelMoveTarget
}

export function CategoryChannelGroup({
  category,
  channels,
  collapsed,
  dragDisabled,
  dropActive,
  dropVisual,
  onCreateChannel,
  onOpenChannelSettings,
  onSelectChannel,
  onToggleCategory,
  selectedChannelId,
}: {
  category: GuildChannelSummary
  channels: GuildChannelSummary[]
  collapsed: boolean
  dragDisabled: boolean
  dropActive: boolean
  dropVisual: DropVisual
  onCreateChannel?: (category: GuildChannelSummary) => void
  onOpenChannelSettings?: (channel: GuildChannelSummary) => void
  onSelectChannel?: (channelId: string) => void
  onToggleCategory: (categoryId: string) => void
  selectedChannelId?: string
}) {
  const { attributes, isDragging, listeners, setNodeRef } = useSortable({
    data: { channel: category, kind: 'channel' as const },
    disabled: dragDisabled,
    id: category.id,
  })
  const { isOver: categoryBodyIsOver, setNodeRef: setCategoryBodyRef } = useDroppable({
    data: { kind: 'container' as const, parentId: category.id },
    disabled: !dropActive,
    id: `category-drop-${category.id}`,
  })
  const categoryIsTarget = dropVisual.overId === category.id
  const categoryEdge =
    categoryIsTarget && dropVisual.target?.parentId !== category.id
      ? dropVisual.target?.placement
      : undefined
  const categoryEndIsTarget =
    dropVisual.target?.parentId === category.id && dropVisual.target.placement === 'end'

  return (
    <section ref={setNodeRef} className={`relative min-w-0 ${isDragging ? 'opacity-35' : ''}`}>
      {categoryEdge === 'before' ? <InsertionIndicator edge="before" /> : null}
      <div className="flex items-center gap-1 px-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-expanded={!collapsed}
          className="flex min-h-7 min-w-0 flex-1 touch-manipulation items-center gap-1.5 rounded-control px-1 text-left text-[0.9rem] font-semibold tracking-[0.01em] text-subtle transition hover:bg-surface-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70"
          onClick={() => onToggleCategory(category.id)}
        >
          <ChevronIcon collapsed={collapsed} />
          <span className="truncate">{category.name}</span>
        </button>
        {onCreateChannel ? (
          <button
            type="button"
            aria-label={`Create a channel in ${category.name}`}
            className="grid size-7 shrink-0 place-items-center rounded-control text-base leading-none text-subtle transition hover:bg-surface-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70"
            onClick={() => onCreateChannel(category)}
          >
            +
          </button>
        ) : null}
        {onOpenChannelSettings ? (
          <button
            type="button"
            aria-label="Open category settings"
            className="grid size-7 shrink-0 place-items-center rounded-control text-subtle transition hover:bg-surface-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70"
            onClick={() => onOpenChannelSettings(category)}
          >
            <SettingsGearIcon />
          </button>
        ) : null}
      </div>
      {!collapsed ? (
        <SortableContext
          items={channels.map((channel) => channel.id)}
          strategy={verticalListSortingStrategy}
        >
          <div
            ref={setCategoryBodyRef}
            className={`mt-0.5 grid min-h-9 gap-0.5 rounded-control transition ${
              categoryBodyIsOver ? 'bg-brand-soft/60 ring-1 ring-brand/50' : ''
            }`}
          >
            {channels.length > 0 ? (
              channels.map((channel) => (
                <SortableChannelButton
                  key={channel.id}
                  channel={channel}
                  dragDisabled={dragDisabled}
                  dropVisual={dropVisual}
                  onOpenChannelSettings={onOpenChannelSettings}
                  onSelectChannel={onSelectChannel}
                  selected={channel.id === selectedChannelId}
                />
              ))
            ) : (
              <p
                className={`rounded-control border border-dashed px-2.5 py-2 text-center text-xs transition ${
                  dropActive
                    ? categoryBodyIsOver
                      ? 'border-brand text-brand-text'
                      : 'border-line-strong text-muted'
                    : 'border-transparent text-subtle'
                }`}
              >
                {dropActive ? 'Drop channel here' : 'No channels yet'}
              </p>
            )}
          </div>
        </SortableContext>
      ) : null}
      {categoryEndIsTarget ? <InsertionIndicator edge="after" /> : null}
      {categoryEdge === 'after' ? <InsertionIndicator edge="after" /> : null}
    </section>
  )
}

export function SortableChannelButton({
  channel,
  dragDisabled,
  dropVisual,
  onOpenChannelSettings,
  onSelectChannel,
  selected,
}: {
  channel: GuildChannelSummary
  dragDisabled: boolean
  dropVisual: DropVisual
  onOpenChannelSettings?: (channel: GuildChannelSummary) => void
  onSelectChannel?: (channelId: string) => void
  selected: boolean
}) {
  const { attributes, isDragging, listeners, setNodeRef } = useSortable({
    data: { channel, kind: 'channel' as const },
    disabled: dragDisabled,
    id: channel.id,
  })
  const indicatorEdge = dropVisual.overId === channel.id ? dropVisual.target?.placement : undefined

  return (
    <div
      ref={setNodeRef}
      className={`relative flex min-w-0 items-center gap-0.5 ${isDragging ? 'opacity-35' : ''}`}
    >
      {indicatorEdge === 'before' ? <InsertionIndicator edge="before" /> : null}
      <ChannelButton
        attributes={attributes}
        channel={channel}
        listeners={listeners}
        onSelectChannel={onSelectChannel}
        selected={selected}
        type={channel.type === GuildChannelType.VOICE ? 'voice' : 'text'}
      />
      {onOpenChannelSettings ? (
        <button
          type="button"
          aria-label="Open channel settings"
          className="grid size-7 shrink-0 place-items-center rounded-control text-subtle transition hover:bg-surface-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70"
          onClick={() => onOpenChannelSettings(channel)}
        >
          <SettingsGearIcon />
        </button>
      ) : null}
      {indicatorEdge === 'after' ? <InsertionIndicator edge="after" /> : null}
    </div>
  )
}

export function RootChannelDropTarget() {
  const { isOver, setNodeRef } = useDroppable({
    data: { kind: 'container' as const, placement: 'start' as const },
    id: 'guild-root-drop',
  })

  return (
    <div ref={setNodeRef} className="absolute -top-4 right-0 left-0 z-30 h-8">
      {isOver ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-1 left-1 h-0.5 -translate-y-1/2 rounded-full bg-brand shadow-[0_0_0_1px_var(--color-surface-raised)]"
        >
          <span className="absolute top-1/2 -left-1 size-2 -translate-y-1/2 rounded-full bg-brand" />
        </span>
      ) : null}
    </div>
  )
}

export function ChannelDragPreview({ channel }: { channel: GuildChannelSummary }) {
  return (
    <div className="flex min-h-9 w-52 items-center gap-2 rounded-control border border-line bg-surface-raised px-2.5 text-sm font-medium text-ink shadow-panel">
      <span aria-hidden="true" className="grid size-4 shrink-0 place-items-center text-subtle">
        {channel.type === GuildChannelType.CATEGORY ? (
          <ChevronIcon collapsed={false} />
        ) : channel.type === GuildChannelType.VOICE ? (
          <VoiceChannelIcon />
        ) : (
          <TextChannelIcon />
        )}
      </span>
      <span className="min-w-0 flex-1 truncate">{channel.name}</span>
      <span aria-hidden="true" className="grid size-5 place-items-center text-subtle">
        <DragHandleIcon />
      </span>
    </div>
  )
}

function ChannelButton({
  attributes,
  channel,
  listeners,
  onSelectChannel,
  selected,
  type,
}: {
  attributes: DraggableAttributes
  channel: GuildChannelSummary
  listeners: DraggableSyntheticListeners
  onSelectChannel?: (channelId: string) => void
  selected: boolean
  type: 'text' | 'voice'
}) {
  return (
    <button
      type="button"
      {...attributes}
      {...listeners}
      aria-current={selected ? 'page' : undefined}
      aria-disabled={!onSelectChannel || undefined}
      className={`flex min-h-9 min-w-0 flex-1 touch-manipulation items-center gap-2 rounded-control px-2.5 text-left text-sm transition ${
        selected
          ? 'bg-brand-soft font-semibold text-brand-text'
          : 'text-muted hover:bg-surface-hover hover:text-ink'
      }`}
      onClick={() => !selected && onSelectChannel?.(channel.id)}
    >
      <span aria-hidden="true" className="grid size-4 shrink-0 place-items-center text-subtle">
        {type === 'voice' ? <VoiceChannelIcon /> : <TextChannelIcon />}
      </span>
      <span className="min-w-0 flex-1 truncate">{channel.name}</span>
    </button>
  )
}

function InsertionIndicator({ edge }: { edge: 'after' | 'before' }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute right-1 left-1 z-20 h-0.5 rounded-full bg-brand shadow-[0_0_0_1px_var(--color-surface-raised)] ${
        edge === 'before' ? '-top-1' : '-bottom-1'
      }`}
    >
      <span className="absolute top-1/2 -left-1 size-2 -translate-y-1/2 rounded-full bg-brand" />
    </span>
  )
}
