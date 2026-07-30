import * as Avatar from '@radix-ui/react-avatar'

import { resolveAvatarUrl } from '@/api/assets'
import type { RelationshipSummary } from '@/api/relationship'
import { Badge } from '@/components/ui/badge'

const relationshipLabels: Record<RelationshipSummary['type'], string> = {
  blocked: 'Blocked',
  friend: 'Friend',
  incoming: 'Incoming',
  outgoing: 'Sent',
}

export function FriendIdentity({ relationship }: { relationship: RelationshipSummary }) {
  const { profile } = relationship
  const avatarUrl = resolveAvatarUrl(profile.userId, profile.avatarAssetId)

  return (
    <>
      <Avatar.Root className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-control bg-surface-hover text-xs font-bold text-muted">
        {avatarUrl ? (
          <Avatar.Image alt="" className="size-full object-cover" src={avatarUrl} />
        ) : null}
        <Avatar.Fallback>{getInitials(profile.name, profile.username)}</Avatar.Fallback>
      </Avatar.Root>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-semibold text-ink">
            {profile.name || profile.username}
          </p>
          <Badge
            tone={
              relationship.type === 'blocked'
                ? 'danger'
                : relationship.type === 'incoming'
                  ? 'warning'
                  : relationship.type === 'friend'
                    ? 'success'
                    : 'neutral'
            }
          >
            {relationshipLabels[relationship.type]}
          </Badge>
        </div>
        <p className="mt-1 truncate text-xs text-subtle">@{profile.username}</p>
      </div>
    </>
  )
}

function getInitials(name: string, username: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
  return initials || username.slice(0, 2).toUpperCase() || 'U'
}
