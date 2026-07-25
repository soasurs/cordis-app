import { useState } from 'react'

import { GuildIcon } from '@/features/guilds/components/guild-icon'

interface GuildPageHeaderProps {
  guildId: string
  iconAssetId: string
  name: string
  onCreateCategory: () => void
  onCreateChannel: () => void
  onOpenSettings?: () => void
}

export function GuildPageHeader({
  guildId,
  iconAssetId,
  name,
  onCreateCategory,
  onCreateChannel,
  onOpenSettings,
}: GuildPageHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="relative flex h-16 shrink-0 items-center gap-3 border-b border-line px-4">
      <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-control border border-line bg-surface text-brand-text">
        <GuildIcon guildId={guildId} iconAssetId={iconAssetId} name={name} size="header" />
      </span>
      <div className="min-w-0">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-brand-text">
          Community
        </p>
        <h1 className="mt-1 truncate text-sm font-semibold text-ink">{name}</h1>
      </div>
      <div
        className="ml-auto"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setMenuOpen(false)
            event.currentTarget.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')?.focus()
          }
        }}
      >
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label="Community menu"
          className="grid size-8 place-items-center rounded-control text-base tracking-[0.12em] text-subtle transition hover:bg-surface-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70"
          onClick={() => setMenuOpen((open) => !open)}
        >
          ···
        </button>
        {menuOpen ? (
          <div
            role="menu"
            aria-label="Community actions"
            className="absolute top-14 right-3 z-30 grid w-52 gap-1 rounded-panel border border-line bg-surface-raised p-1.5 shadow-panel"
          >
            {onOpenSettings ? (
              <>
                <button
                  type="button"
                  role="menuitem"
                  className="whitespace-nowrap rounded-control px-3 py-2 text-left text-sm font-medium text-ink transition hover:bg-surface-hover focus:bg-surface-hover focus:outline-none"
                  onClick={() => {
                    setMenuOpen(false)
                    onOpenSettings()
                  }}
                >
                  Community settings
                </button>
                <div role="separator" className="my-0.5 h-px bg-line" />
              </>
            ) : null}
            <button
              type="button"
              role="menuitem"
              className="whitespace-nowrap rounded-control px-3 py-2 text-left text-sm font-medium text-ink transition hover:bg-surface-hover focus:bg-surface-hover focus:outline-none"
              onClick={() => {
                setMenuOpen(false)
                onCreateChannel()
              }}
            >
              Create channel
            </button>
            <button
              type="button"
              role="menuitem"
              className="whitespace-nowrap rounded-control px-3 py-2 text-left text-sm font-medium text-ink transition hover:bg-surface-hover focus:bg-surface-hover focus:outline-none"
              onClick={() => {
                setMenuOpen(false)
                onCreateCategory()
              }}
            >
              Create category
            </button>
          </div>
        ) : null}
      </div>
    </header>
  )
}
