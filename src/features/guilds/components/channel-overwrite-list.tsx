import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import type { GuildChannelPermissionOverwrite } from '@/api/guild'
import {
  type GuildChannelOverwriteSummary,
  type GuildRoleSummary,
} from '@/features/guilds/guild-queries'
import { channelOverwriteKey } from '@/features/guilds/components/channel-overwrite-utils'
import { userProfileQueryOptions } from '@/features/users/user-queries'

export function ChannelOverwriteList({
  onAddRole,
  onSelect,
  overwrites,
  roles,
  selectedKey,
}: {
  onAddRole: () => void
  onSelect: (key: string) => void
  overwrites: GuildChannelOverwriteSummary[]
  roles: GuildRoleSummary[]
  selectedKey?: string
}) {
  return (
    <nav
      aria-label="Channel overwrites"
      className="overflow-hidden rounded-shell border border-line bg-surface-raised shadow-panel lg:sticky lg:top-0 lg:max-h-[calc(100svh-2rem)] lg:overflow-y-auto"
    >
      <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
        <p className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-[0.12em] text-subtle">
          Overwrites
        </p>
        <Button aria-label="Add role overwrite" size="small" variant="ghost" onClick={onAddRole}>
          +
        </Button>
      </div>
      {overwrites.length === 0 ? (
        <p className="px-3 py-4 text-xs leading-5 text-subtle">No overwrites yet.</p>
      ) : (
        <div className="grid gap-1 p-2">
          {overwrites.map((overwrite) => {
            const key = channelOverwriteKey(overwrite)
            const active = key === selectedKey
            return (
              <button
                type="button"
                aria-current={active ? 'true' : undefined}
                className={`rounded-control px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 ${
                  active
                    ? 'bg-brand-soft text-brand-text'
                    : 'text-muted hover:bg-surface-hover hover:text-ink'
                }`}
                key={key}
                onClick={() => onSelect(key)}
              >
                <span className="block truncate text-sm font-semibold">
                  <ChannelOverwriteLabel overwrite={overwrite} roles={roles} />
                </span>
                <span className="mt-0.5 block text-xs capitalize text-subtle">
                  {overwrite.appliesTo}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </nav>
  )
}

export function ChannelOverwriteLabel({
  overwrite,
  roles,
}: {
  overwrite: GuildChannelPermissionOverwrite
  roles: GuildRoleSummary[]
}) {
  if (overwrite.appliesTo === 'role') {
    const role = roles.find((item) => item.id === overwrite.appliesToId)
    return <>{role?.name ?? `Role ${overwrite.appliesToId}`}</>
  }

  return <MemberOverwriteLabel userId={overwrite.appliesToId} />
}

function MemberOverwriteLabel({ userId }: { userId: string }) {
  const profileQuery = useQuery(userProfileQueryOptions(userId))
  const profile = profileQuery.data
  if (profile) {
    return <>{profile.name || profile.username || `User ${userId}`}</>
  }
  if (profileQuery.isPending) {
    return <>Loading member…</>
  }
  return <>User {userId}</>
}
