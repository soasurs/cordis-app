import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'

import {
  guildSettingsSections,
  type GuildSettingsSection,
} from '@/features/guilds/guild-settings-types'

interface GuildSettingsLayoutProps {
  children: ReactNode
  guildName: string
  onClose: () => void
  onSelectSection?: (section: GuildSettingsSection) => void
  section: GuildSettingsSection
}

export function GuildSettingsLayout({
  children,
  guildName,
  onClose,
  onSelectSection,
  section,
}: GuildSettingsLayoutProps) {
  const sectionLabel =
    guildSettingsSections.find((item) => item.id === section)?.label ?? 'Overview'

  return (
    <main className="flex min-h-0 flex-1 bg-surface">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface-raised sm:flex">
        <div className="border-b border-line px-5 py-5">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-brand-text">
            Community settings
          </p>
          <p className="mt-1.5 truncate text-sm font-semibold text-ink">{guildName}</p>
        </div>
        <GuildSettingsNavigation section={section} onSelectSection={onSelectSection} />
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center border-b border-line bg-surface/90 px-5 backdrop-blur sm:px-7">
          <div className="min-w-0">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-brand-text sm:hidden">
              Community settings
            </p>
            <h1 className="truncate text-sm font-semibold text-ink sm:text-base">{sectionLabel}</h1>
          </div>
          <Button
            aria-label="Close community settings"
            className="ml-auto size-8 px-0 text-lg"
            size="small"
            title="Close community settings"
            variant="ghost"
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </Button>
        </header>

        <GuildSettingsNavigation compact section={section} onSelectSection={onSelectSection} />

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-7 sm:px-8 sm:py-10">
          <div className="mx-auto w-full max-w-3xl">{children}</div>
        </div>
      </section>
    </main>
  )
}

function GuildSettingsNavigation({
  compact = false,
  onSelectSection,
  section,
}: {
  compact?: boolean
  onSelectSection?: (section: GuildSettingsSection) => void
  section: GuildSettingsSection
}) {
  return (
    <nav
      aria-label="Community settings"
      className={
        compact
          ? 'flex shrink-0 gap-1 overflow-x-auto border-b border-line bg-surface-raised px-3 py-2 sm:hidden'
          : 'grid gap-1 p-3'
      }
    >
      {guildSettingsSections.map((item) => {
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
            disabled={!onSelectSection}
            key={item.id}
            onClick={() => onSelectSection?.(item.id)}
          >
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}

export function GuildSettingsMessage({
  description,
  title,
}: {
  description: string
  title: string
}) {
  return (
    <div className="rounded-shell border border-line bg-surface-raised p-6 shadow-panel sm:p-8">
      <h2 className="text-xl font-semibold tracking-[-0.02em] text-ink">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
    </div>
  )
}
