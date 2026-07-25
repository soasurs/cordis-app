import * as Avatar from '@radix-ui/react-avatar'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import * as Tooltip from '@radix-ui/react-tooltip'
import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from 'react'

import type { GatewayStatus } from '@/app/gateway-context'
import { GuildIcon } from '@/features/guilds/components/guild-icon'

export interface AppUserSummary {
  name: string
  username: string
}

export interface AppGuildSummary {
  iconAssetId: string
  id: string
  name: string
}

interface AppShellProps extends PropsWithChildren {
  activeGuildId?: string
  gatewayStatus?: GatewayStatus
  guilds?: AppGuildSummary[]
  onCreateCommunity?: () => void
  onSelectGuild?: (guildId: string) => void
  onSelectHome?: () => void
  user: AppUserSummary
}

const homeNavigation = [
  { label: 'Home', icon: '⌂', active: true },
  { label: 'Friends', icon: '◎' },
  { label: 'Message requests', icon: '↗' },
]

function getInitials(name: string, username: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length > 0) {
    return parts
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
  }

  return username.slice(0, 2).toUpperCase() || 'C'
}

function RailButton({
  active = false,
  children,
  disabled = false,
  label,
  onClick,
}: {
  active?: boolean
  children: ReactNode
  disabled?: boolean
  label: string
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick']
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          aria-current={active ? 'page' : undefined}
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          className={`group relative grid size-10 place-items-center overflow-hidden rounded-panel border text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 ${
            active
              ? 'border-brand bg-brand text-white shadow-brand'
              : 'border-line bg-surface text-muted hover:border-line-strong hover:bg-surface-hover hover:text-ink disabled:cursor-not-allowed disabled:hover:border-line disabled:hover:bg-surface disabled:hover:text-muted'
          }`}
        >
          {active ? (
            <span className="absolute -left-[0.8rem] h-6 w-0.5 rounded-r bg-brand" />
          ) : null}
          {children}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={10}
          className="z-50 rounded-control border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink shadow-panel"
        >
          {label}
          <Tooltip.Arrow className="fill-surface" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

function SpaceRail({
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
      <RailButton disabled label="Settings">
        <span className="text-xs">S</span>
      </RailButton>
    </nav>
  )
}

function HomeSidebar({
  gatewayStatus,
  user,
}: {
  gatewayStatus: GatewayStatus
  user: AppUserSummary
}) {
  const initials = getInitials(user.name, user.username)
  const connected = gatewayStatus.state === 'ready'

  return (
    <aside className="hidden w-60 shrink-0 border-r border-line bg-surface-raised lg:flex lg:flex-col">
      <header className="flex h-16 shrink-0 items-center border-b border-line px-5">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-brand-text">
            Personal space
          </p>
          <h1 className="mt-1 text-sm font-semibold text-ink">Cordis Home</h1>
        </div>
      </header>

      <ScrollArea.Root className="min-h-0 flex-1 overflow-hidden">
        <ScrollArea.Viewport className="size-full px-3 py-4">
          <nav aria-label="Home navigation" className="grid gap-1">
            {homeNavigation.map((item) => (
              <button
                key={item.label}
                type="button"
                aria-current={item.active ? 'page' : undefined}
                disabled={!item.active}
                className={`flex min-h-10 w-full items-center gap-3 rounded-control px-3 text-left text-sm font-medium transition ${
                  item.active
                    ? 'bg-brand-soft text-brand-text'
                    : 'text-muted hover:bg-surface-hover hover:text-ink disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted'
                }`}
              >
                <span aria-hidden="true" className="w-4 text-center text-base">
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-8 flex items-center justify-between px-3">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-subtle">
              Direct messages
            </p>
            <button
              type="button"
              disabled
              aria-label="Start a direct message"
              className="text-lg leading-none text-subtle disabled:cursor-not-allowed"
            >
              +
            </button>
          </div>
          <div className="mt-3 rounded-panel border border-dashed border-line px-3 py-4">
            <p className="text-xs font-medium text-muted">No conversations yet</p>
            <p className="mt-1 text-xs leading-5 text-subtle">
              Your recent direct messages will appear here.
            </p>
          </div>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical" className="flex w-2 p-0.5">
          <ScrollArea.Thumb className="flex-1 rounded-full bg-line-strong" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>

      <footer className="m-3 flex items-center gap-3 rounded-panel border border-line bg-surface p-3">
        <Avatar.Root className="relative grid size-9 shrink-0 place-items-center rounded-control bg-brand-soft text-xs font-bold text-brand-text">
          <Avatar.Fallback>{initials}</Avatar.Fallback>
          <span
            title={connected ? 'Realtime connected' : 'Realtime disconnected'}
            className={`absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-surface ${connected ? 'bg-positive' : 'bg-subtle'}`}
          />
        </Avatar.Root>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{user.name || user.username}</p>
          <p className="truncate text-xs text-subtle">@{user.username}</p>
        </div>
        <button
          type="button"
          disabled
          aria-label="User settings"
          className="text-base text-subtle disabled:cursor-not-allowed"
        >
          ···
        </button>
      </footer>
    </aside>
  )
}

function MobileHeader({
  contextName,
  gatewayStatus,
  user,
}: {
  contextName: string
  gatewayStatus: GatewayStatus
  user: AppUserSummary
}) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 md:hidden">
      <span className="grid size-9 place-items-center rounded-control border border-brand/25 bg-brand-soft text-sm font-black text-brand-text">
        C
      </span>
      <div className="min-w-0">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-brand-text">
          {contextName === 'Home' ? 'Personal space' : 'Community'}
        </p>
        <p className="truncate text-sm font-semibold text-ink">{contextName}</p>
      </div>
      <span
        aria-label={`Realtime status: ${gatewayStatus.state}`}
        className={`ml-auto size-2 rounded-full ${gatewayStatus.state === 'ready' ? 'bg-positive' : gatewayStatus.state === 'reconnecting' ? 'bg-warning' : 'bg-subtle'}`}
      />
      <Avatar.Root className="grid size-9 place-items-center rounded-control bg-surface-hover text-xs font-bold text-muted">
        <Avatar.Fallback>{getInitials(user.name, user.username)}</Avatar.Fallback>
      </Avatar.Root>
    </header>
  )
}

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
