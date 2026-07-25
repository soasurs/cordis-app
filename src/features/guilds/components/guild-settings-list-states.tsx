import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function SettingsPageHeading({
  count,
  description,
  eyebrow,
  title,
}: {
  count?: number | string
  description: string
  eyebrow: string
  title: string
}) {
  return (
    <div className="mb-7">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-text">{eyebrow}</p>
      <div className="mt-2 flex items-center gap-3">
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-ink">{title}</h2>
        {count !== undefined ? <Badge>{count}</Badge> : null}
      </div>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p>
    </div>
  )
}

export function SettingsListSkeleton() {
  return (
    <div
      aria-label="Loading settings list"
      className="overflow-hidden rounded-shell border border-line bg-surface-raised"
    >
      {[0, 1, 2].map((item) => (
        <div
          className="flex animate-pulse items-center gap-4 border-b border-line px-5 py-4 last:border-b-0"
          key={item}
        >
          <span className="size-10 rounded-control bg-surface-hover" />
          <div className="grid flex-1 gap-2">
            <span className="h-3 w-32 rounded bg-surface-hover" />
            <span className="h-2.5 w-48 max-w-full rounded bg-surface-hover" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SettingsListError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-shell border border-negative/25 bg-negative/10 p-5 text-negative">
      <p role="alert" className="text-sm">
        {message}
      </p>
      <Button className="mt-4" size="small" variant="danger" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}

export function SettingsEmptyState({ description, title }: { description: string; title: string }) {
  return (
    <div className="rounded-shell border border-dashed border-line bg-surface-raised p-8 text-center">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
    </div>
  )
}
