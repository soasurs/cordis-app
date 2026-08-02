const personalNavigationItems = [
  { icon: '⌂', id: 'home', label: 'Home' },
  { icon: '◎', id: 'friends', label: 'Friends' },
  { icon: '✉', id: 'dm', label: 'Messages' },
] as const

export function PersonalNavigation({
  activeSection,
  compact = false,
  onSelectDm,
  onSelectFriends,
  onSelectHome,
}: {
  activeSection: 'dm' | 'friends' | 'home'
  compact?: boolean
  onSelectDm?: () => void
  onSelectFriends?: () => void
  onSelectHome?: () => void
}) {
  return (
    <nav
      aria-label="Home navigation"
      className={
        compact
          ? 'flex shrink-0 gap-1 overflow-x-auto border-b border-line bg-surface-raised px-3 py-2 md:hidden'
          : 'grid gap-1'
      }
    >
      {personalNavigationItems.map((item) => {
        const active = item.id === activeSection
        const onSelect =
          item.id === 'home' ? onSelectHome : item.id === 'friends' ? onSelectFriends : onSelectDm

        return (
          <button
            key={item.id}
            type="button"
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-10 items-center gap-3 rounded-control px-3 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 ${
              active
                ? 'bg-brand-soft text-brand-text'
                : 'text-muted hover:bg-surface-hover hover:text-ink'
            } ${compact ? 'shrink-0' : 'w-full'}`}
            disabled={!onSelect}
            onClick={onSelect}
          >
            <span aria-hidden="true" className="w-4 text-center text-base">
              {item.icon}
            </span>
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
