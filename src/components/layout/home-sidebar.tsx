import * as ScrollArea from '@radix-ui/react-scroll-area'

import type { GatewayStatus } from '@/app/gateway-context'
import type { AppUserSummary } from '@/components/layout/app-shell-types'
import { CurrentUserPanel } from '@/components/layout/current-user-panel'
import { PersonalNavigation } from '@/components/layout/personal-navigation'

export function HomeSidebar({
  activeSection,
  gatewayStatus,
  onOpenUserSettings,
  onSelectFriends,
  onSelectHome,
  user,
}: {
  activeSection: 'friends' | 'home'
  gatewayStatus: GatewayStatus
  onOpenUserSettings?: () => void
  onSelectFriends?: () => void
  onSelectHome?: () => void
  user: AppUserSummary
}) {
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
          <PersonalNavigation
            activeSection={activeSection}
            onSelectFriends={onSelectFriends}
            onSelectHome={onSelectHome}
          />

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

      <CurrentUserPanel
        gatewayStatus={gatewayStatus}
        user={user}
        onOpenUserSettings={onOpenUserSettings}
      />
    </aside>
  )
}
