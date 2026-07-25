import { useQuery } from '@tanstack/react-query'

import { Badge } from '@/components/ui/badge'
import { userProfileQueryOptions } from '@/features/users/user-queries'

import type { GuildMemberSummary } from '../guild-queries'

interface GuildMemberIdentityProps {
  guildOwnerId?: string
  member: GuildMemberSummary
}

export function GuildMemberIdentity({ guildOwnerId, member }: GuildMemberIdentityProps) {
  const profileQuery = useQuery({
    ...userProfileQueryOptions(member.userId),
    enabled: !member.profile,
  })
  const profile = member.profile ?? profileQuery.data
  const displayName =
    member.nickname || profile?.name || profile?.username || `User ${member.userId}`
  const profileLabel = profile
    ? [profile.name !== displayName ? profile.name : undefined, `@${profile.username}`]
        .filter(Boolean)
        .join(' · ')
    : profileQuery.isPending
      ? 'Loading profile…'
      : `User ID ${member.userId}`

  return (
    <>
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-control bg-surface-hover text-xs font-bold text-muted"
      >
        {getInitials(displayName)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
          {guildOwnerId && member.userId === guildOwnerId ? (
            <Badge tone="brand">Owner</Badge>
          ) : null}
        </div>
        <p className="mt-1 truncate text-xs text-subtle">{profileLabel}</p>
      </div>
    </>
  )
}

function getInitials(value: string) {
  const initials = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
  return initials || 'U'
}
