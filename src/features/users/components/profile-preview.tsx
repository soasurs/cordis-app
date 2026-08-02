import * as Avatar from '@radix-ui/react-avatar'

import { getInitials } from '@/components/layout/app-shell-types'

export function ProfilePreview({
  avatarUrl,
  bio,
  createdAt,
  fallbackName,
  name,
  username,
}: {
  avatarUrl?: string
  bio: string
  createdAt: number
  fallbackName: string
  name: string
  username: string
}) {
  const displayName = name.trim() || fallbackName || username
  const previewInitials = getInitials(displayName, username)

  return (
    <aside className="rounded-shell border border-line bg-surface-raised p-5 shadow-panel lg:sticky lg:top-0">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-subtle">
        Profile preview
      </p>
      <div className="mt-5 flex items-center gap-3">
        <Avatar.Root className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-[1.1rem] bg-brand-soft text-sm font-bold text-brand-text">
          {avatarUrl ? (
            <Avatar.Image alt="" className="size-full object-cover" src={avatarUrl} />
          ) : null}
          <Avatar.Fallback>{previewInitials}</Avatar.Fallback>
        </Avatar.Root>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-ink">{displayName}</p>
          <p className="truncate text-xs text-subtle">@{username}</p>
        </div>
      </div>
      <p className="mt-5 min-h-10 whitespace-pre-wrap text-sm leading-6 text-muted">
        {bio.trim() || 'No bio yet.'}
      </p>
      <div className="mt-5 border-t border-line pt-4">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-subtle">
          Member since
        </p>
        <p className="mt-2 text-xs text-muted">{formatMemberSince(createdAt)}</p>
      </div>
    </aside>
  )
}

export function ProfileStatus({ error, saved }: { error?: string; saved: boolean }) {
  if (error) {
    return (
      <div
        role="alert"
        className="mb-5 rounded-control border border-negative/25 bg-negative/10 px-3 py-2.5 text-sm text-negative"
      >
        {error}
      </div>
    )
  }
  return saved ? (
    <div
      role="status"
      className="mb-5 rounded-control border border-positive/25 bg-positive/10 px-3 py-2.5 text-sm text-positive"
    >
      Profile saved.
    </div>
  ) : null
}

function formatMemberSince(timestamp: number) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return 'Cordis member'
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(timestamp)
}
