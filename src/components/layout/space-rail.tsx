import { GuildIcon } from '@/features/guilds/components/guild-icon'
import { PresenceStatusSelect } from '@/features/presence/components/presence-status-select'

import type { AppGuildSummary } from '@/components/layout/app-shell-types'
import { RailButton } from '@/components/layout/rail-button'

export function SpaceRail({
  activeGuildId,
  guilds,
  onCreateCommunity,
  onOpenUserSettings,
  onSelectGuild,
  onSelectHome,
  userSettingsOpen = false,
}: {
  activeGuildId?: string
  guilds: AppGuildSummary[]
  onCreateCommunity?: () => void
  onOpenUserSettings?: () => void
  onSelectGuild?: (guildId: string) => void
  onSelectHome?: () => void
  userSettingsOpen?: boolean
}) {
  return (
    <nav
      aria-label="Spaces"
      className="hidden w-[4.5rem] shrink-0 flex-col items-center gap-3 border-r border-line bg-canvas py-3 md:flex"
    >
      <RailButton
        active={!activeGuildId && !userSettingsOpen}
        label="Cordis home"
        onClick={onSelectHome}
      >
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
      <RailButton
        active={userSettingsOpen}
        disabled={!onOpenUserSettings}
        label="User settings"
        onClick={onOpenUserSettings}
      >
        <SettingsIcon />
      </RailButton>
    </nav>
  )
}

function SettingsIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M9.7 3.2 9.2 5a7.8 7.8 0 0 0-1.4.8L6 5.3 4.3 7l.5 1.8a7.8 7.8 0 0 0-.8 1.4l-1.8.5v2.4l1.8.5a7.8 7.8 0 0 0 .8 1.4l-.5 1.8L6 18.5l1.8-.5a7.8 7.8 0 0 0 1.4.8l.5 1.8h2.4l.5-1.8A7.8 7.8 0 0 0 14 18l1.8.5 1.7-1.7L17 15a7.8 7.8 0 0 0 .8-1.4l1.8-.5v-2.4l-1.8-.5a7.8 7.8 0 0 0-.8-1.4l.5-1.8-1.7-1.7-1.8.5a7.8 7.8 0 0 0-1.4-.8l-.5-1.8H9.7Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <circle cx="10.9" cy="11.9" r="2.6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}
