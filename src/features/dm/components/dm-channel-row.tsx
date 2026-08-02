import * as Avatar from '@radix-ui/react-avatar'

import { resolveAvatarUrl } from '@/api/assets'
import type { DmChannelSummary } from '@/api/dm'
import { Badge } from '@/components/ui/badge'
import { getInitials } from '@/components/layout/app-shell-types'
import { PresenceIndicator } from '@/features/presence/components/presence-indicator'
import { useUserPresence } from '@/features/presence/presence-queries'
import type { ChannelReadStateSummary } from '@/api/message'
import { getMentionCount, isChannelUnread } from '@/features/messages/read-state-queries'

interface DmChannelRowProps {
  active?: boolean
  channel: DmChannelSummary
  onSelect?: (channelId: string) => void
  readState?: ChannelReadStateSummary
}

export function DmChannelRow({ active = false, channel, onSelect, readState }: DmChannelRowProps) {
  const { recipient } = channel
  const presence = useUserPresence(recipient.userId)
  const displayName = recipient.name || recipient.username || `User ${recipient.userId}`
  const avatarUrl = resolveAvatarUrl(recipient.userId, recipient.avatarAssetId)
  const unread = isChannelUnread(readState)
  const mentionCount = getMentionCount(readState)

  return (
    <li>
      <button
        type="button"
        aria-current={active ? 'page' : undefined}
        className={`flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 ${
          active ? 'bg-brand-soft text-brand-text' : 'text-ink hover:bg-surface-hover'
        }`}
        disabled={!onSelect}
        onClick={() => onSelect?.(channel.channelId)}
      >
        <span className="relative shrink-0">
          <Avatar.Root className="grid size-9 place-items-center overflow-hidden rounded-control bg-surface-hover text-xs font-bold text-muted">
            {avatarUrl ? (
              <Avatar.Image alt="" className="size-full object-cover" src={avatarUrl} />
            ) : null}
            <Avatar.Fallback>{getInitials(recipient.name, recipient.username)}</Avatar.Fallback>
          </Avatar.Root>
          {presence ? <PresenceIndicator status={presence.status} /> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-current">{displayName}</span>
          <span className="mt-0.5 block truncate text-xs text-subtle">@{recipient.username}</span>
        </span>
        {unread ? (
          <span
            aria-label="Unread messages"
            className="size-2 shrink-0 rounded-full bg-brand"
            title="Unread messages"
          />
        ) : null}
        {mentionCount > 0 ? <Badge tone="danger">{mentionCount}</Badge> : null}
      </button>
    </li>
  )
}
