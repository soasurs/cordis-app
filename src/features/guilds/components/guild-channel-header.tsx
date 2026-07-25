import { GuildChannelType } from '@/api/guild'
import { TextChannelIcon, VoiceChannelIcon } from '@/features/guilds/components/channel-icons'
import type { GuildChannelSummary } from '@/features/guilds/guild-queries'

interface GuildChannelHeaderProps {
  channel?: GuildChannelSummary
  guildName: string
}

export function GuildChannelHeader({ channel, guildName }: GuildChannelHeaderProps) {
  return (
    <header className="hidden h-16 shrink-0 items-center gap-3 border-b border-line bg-surface/90 px-5 backdrop-blur sm:flex">
      <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center text-subtle">
        {channel?.type === GuildChannelType.VOICE ? <VoiceChannelIcon /> : <TextChannelIcon />}
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
