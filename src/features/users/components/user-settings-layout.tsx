import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import {
  userSettingsSections,
  type UserSettingsSection,
} from '@/features/users/user-settings-types'

export function UserSettingsLayout({
  children,
  displayName,
  onClose,
  onSelectSection,
  section,
}: {
  children: ReactNode
  displayName: string
  onClose: () => void
  onSelectSection: (section: UserSettingsSection) => void
  section: UserSettingsSection
}) {
  const sectionLabel = userSettingsSections.find((item) => item.id === section)?.label ?? 'Profile'

  return (
    <main className="flex min-h-0 flex-1 bg-surface">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface-raised sm:flex">
        <div className="border-b border-line px-5 py-5">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-brand-text">
            User settings
          </p>
          <p className="mt-1.5 truncate text-sm font-semibold text-ink">{displayName}</p>
        </div>
        <UserSettingsNavigation section={section} onSelectSection={onSelectSection} />
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center border-b border-line bg-surface/90 px-5 backdrop-blur sm:px-7">
          <div className="min-w-0">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-brand-text sm:hidden">
              User settings
            </p>
            <h1 className="truncate text-sm font-semibold text-ink sm:text-base">{sectionLabel}</h1>
          </div>
          <Button
            aria-label="Close user settings"
            className="ml-auto size-8 px-0 text-lg"
            size="small"
            title="Close user settings"
            variant="ghost"
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </Button>
        </header>

        <UserSettingsNavigation compact section={section} onSelectSection={onSelectSection} />

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-7 sm:px-8 sm:py-10">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </div>
      </section>
    </main>
  )
}

function UserSettingsNavigation({
  compact = false,
  onSelectSection,
  section,
}: {
  compact?: boolean
  onSelectSection: (section: UserSettingsSection) => void
  section: UserSettingsSection
}) {
  return (
    <nav
      aria-label="User settings"
      className={
        compact
          ? 'flex shrink-0 gap-1 overflow-x-auto border-b border-line bg-surface-raised px-3 py-2 sm:hidden'
          : 'grid gap-1 p-3'
      }
    >
      {userSettingsSections.map((item) => {
        const active = item.id === section
        return (
          <button
            type="button"
            aria-current={active ? 'page' : undefined}
            className={`rounded-control px-3 py-2.5 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 ${
              active
                ? 'bg-brand-soft text-brand-text'
                : 'text-muted hover:bg-surface-hover hover:text-ink'
            } ${compact ? 'whitespace-nowrap' : ''}`}
            key={item.id}
            onClick={() => onSelectSection(item.id)}
          >
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
