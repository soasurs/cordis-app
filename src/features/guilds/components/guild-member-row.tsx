import type { GuildMemberSummary } from '@/features/guilds/guild-queries'
import { GuildMemberIdentity } from '@/features/guilds/components/guild-member-identity'

interface GuildMemberRowProps {
  guildOwnerId: string
  member: GuildMemberSummary
}

export function GuildMemberRow({ guildOwnerId, member }: GuildMemberRowProps) {
  return (
    <li className="flex items-center gap-4 border-b border-line px-4 py-4 last:border-b-0 sm:px-5">
      <GuildMemberIdentity guildOwnerId={guildOwnerId} member={member} />
      <p className="hidden shrink-0 text-right text-xs text-subtle sm:block">
        Joined {formatMemberDate(member.joinedAt)}
      </p>
    </li>
  )
}

function formatMemberDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(timestamp)
}
