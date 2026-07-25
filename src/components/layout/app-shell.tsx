import type { AppShellProps } from '@/components/layout/app-shell-types'
import { HomeSidebar } from '@/components/layout/home-sidebar'
import { MobileHeader } from '@/components/layout/mobile-header'
import { SpaceRail } from '@/components/layout/space-rail'

export type { AppGuildSummary, AppUserSummary } from '@/components/layout/app-shell-types'

export function AppShell({
  activeGuildId,
  children,
  gatewayStatus = { errorCode: null, state: 'idle' },
  guilds = [],
  onCreateCommunity,
  onSelectGuild,
  onSelectHome,
  user,
}: AppShellProps) {
  const activeGuild = guilds.find((guild) => guild.id === activeGuildId)

  return (
    <div className="flex h-svh min-h-[32rem] overflow-hidden bg-canvas text-ink">
      <SpaceRail
        activeGuildId={activeGuildId}
        guilds={guilds}
        onCreateCommunity={onCreateCommunity}
        onSelectGuild={onSelectGuild}
        onSelectHome={onSelectHome}
      />
      {!activeGuildId ? <HomeSidebar gatewayStatus={gatewayStatus} user={user} /> : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader
          contextName={activeGuild?.name ?? (activeGuildId ? 'Community' : 'Home')}
          gatewayStatus={gatewayStatus}
          user={user}
        />
        {children}
      </div>
    </div>
  )
}
