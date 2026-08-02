import type { AppShellProps } from '@/components/layout/app-shell-types'
import { HomeSidebar } from '@/components/layout/home-sidebar'
import { MobileHeader } from '@/components/layout/mobile-header'
import { PersonalNavigation } from '@/components/layout/personal-navigation'
import { SpaceRail } from '@/components/layout/space-rail'

export type { AppGuildSummary, AppUserSummary } from '@/components/layout/app-shell-types'

export function AppShell({
  activeDmChannelId,
  activeGuildId,
  activePersonalSection = 'home',
  children,
  gatewayStatus = { errorCode: null, state: 'idle' },
  guilds = [],
  onCreateCommunity,
  onOpenNewDm,
  onOpenUserSettings,
  onSelectDm,
  onSelectFriends,
  onSelectGuild,
  onSelectHome,
  userSettingsOpen = false,
  user,
}: AppShellProps) {
  const activeGuild = guilds.find((guild) => guild.id === activeGuildId)

  return (
    <div className="flex h-svh min-h-[32rem] overflow-hidden bg-canvas text-ink">
      <SpaceRail
        activeGuildId={activeGuildId}
        guilds={guilds}
        onCreateCommunity={onCreateCommunity}
        onOpenUserSettings={onOpenUserSettings}
        onSelectGuild={onSelectGuild}
        onSelectHome={onSelectHome}
        userSettingsOpen={userSettingsOpen}
      />
      {!activeGuildId && !userSettingsOpen ? (
        <HomeSidebar
          activeDmChannelId={activeDmChannelId}
          activeSection={activePersonalSection}
          gatewayStatus={gatewayStatus}
          onOpenNewDm={onOpenNewDm}
          onOpenUserSettings={onOpenUserSettings}
          onSelectDm={onSelectDm}
          onSelectFriends={onSelectFriends}
          onSelectHome={onSelectHome}
          user={user}
        />
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        {!userSettingsOpen ? (
          <MobileHeader
            contextName={
              activeGuild?.name ??
              (activeGuildId
                ? 'Community'
                : activePersonalSection === 'friends'
                  ? 'Friends'
                  : activePersonalSection === 'dm'
                    ? 'Messages'
                    : 'Home')
            }
            gatewayStatus={gatewayStatus}
            user={user}
            onOpenUserSettings={onOpenUserSettings}
          />
        ) : null}
        {!activeGuildId && !userSettingsOpen ? (
          <PersonalNavigation
            compact
            activeSection={activePersonalSection}
            onSelectDm={onSelectDm}
            onSelectFriends={onSelectFriends}
            onSelectHome={onSelectHome}
          />
        ) : null}
        {children}
      </div>
    </div>
  )
}
