import { GuildIcon } from '@/features/guilds/components/guild-icon'
import { PresenceStatusSelect } from '@/features/presence/components/presence-status-select'

import type { AppGuildSummary } from '@/components/layout/app-shell-types'
import { RailButton } from '@/components/layout/rail-button'

export function SpaceRail({
  activeGuildId,
  guilds,
  onCreateCommunity,
  onSelectGuild,
  onSelectHome,
}: {
  activeGuildId?: string
  guilds: AppGuildSummary[]
  onCreateCommunity?: () => void
  onSelectGuild?: (guildId: string) => void
  onSelectHome?: () => void
}) {
  return (
    <nav
      aria-label="Spaces"
      className="hidden w-[4.5rem] shrink-0 flex-col items-center gap-3 border-r border-line bg-canvas py-3 md:flex"
    >
      <RailButton active={!activeGuildId} label="Cordis home" onClick={onSelectHome}>
        C
      </RailButton>
      <div className="h-px w-8 bg-line" />

      <div className="flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto px-2">
        {guilds.length === 0 ? (
          <p className="sr-only">Your communities will appear here.</p>
        ) : (
          guilds.map((guild) => (
            <RailButton
              active={guild.id === activeGuildId}
              disabled={!onSelectGuild}
              key={guild.id}
              label={guild.name}
              onClick={() => onSelectGuild?.(guild.id)}
            >
              <span className="size-full overflow-hidden rounded-[inherit]">
                <GuildIcon
                  className={
                    guild.id === activeGuildId ? 'text-white' : 'text-muted group-hover:text-ink'
                  }
                  guildId={guild.id}
                  iconAssetId={guild.iconAssetId}
                  name={guild.name}
                  size="rail"
                />
              </span>
            </RailButton>
          ))
        )}
      </div>

      <RailButton
        disabled={!onCreateCommunity}
        label="Create a community"
        onClick={onCreateCommunity}
      >
        <span className="text-lg font-normal">+</span>
      </RailButton>
      <PresenceStatusSelect />
      <RailButton disabled label="Settings">
        <span className="text-xs">S</span>
      </RailButton>
    </nav>
  )
}
