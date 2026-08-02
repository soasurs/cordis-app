import * as Avatar from '@radix-ui/react-avatar'

import { resolveAvatarUrl } from '@/api/assets'
import type { GatewayStatus } from '@/app/gateway-context'
import { getInitials, type AppUserSummary } from '@/components/layout/app-shell-types'
import { PresenceStatusSelect } from '@/features/presence/components/presence-status-select'

export function MobileHeader({
  contextName,
  gatewayStatus,
  onOpenUserSettings,
  user,
}: {
  contextName: string
  gatewayStatus: GatewayStatus
  onOpenUserSettings?: () => void
  user: AppUserSummary
}) {
  const avatarUrl =
    user.userId && user.avatarAssetId
      ? resolveAvatarUrl(user.userId, user.avatarAssetId)
      : undefined

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 md:hidden">
      <span className="grid size-9 place-items-center rounded-control border border-brand/25 bg-brand-soft text-sm font-black text-brand-text">
        C
      </span>
      <div className="min-w-0">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-brand-text">
          {contextName === 'Home' || contextName === 'Friends' || contextName === 'Messages'
            ? 'Personal space'
            : 'Community'}
        </p>
        <p className="truncate text-sm font-semibold text-ink">{contextName}</p>
      </div>
      <span
        aria-label={`Realtime status: ${gatewayStatus.state}`}
        className={`ml-auto size-2 rounded-full ${gatewayStatus.state === 'ready' ? 'bg-positive' : gatewayStatus.state === 'reconnecting' ? 'bg-warning' : 'bg-subtle'}`}
      />
      <PresenceStatusSelect size="mobile" />
      <button
        type="button"
        aria-label="User settings"
        className="rounded-control outline-none focus-visible:ring-2 focus-visible:ring-brand/70"
        disabled={!onOpenUserSettings}
        onClick={onOpenUserSettings}
      >
        <Avatar.Root className="grid size-9 place-items-center overflow-hidden rounded-control bg-surface-hover text-xs font-bold text-muted">
          {avatarUrl ? (
            <Avatar.Image alt="" className="size-full object-cover" src={avatarUrl} />
          ) : null}
          <Avatar.Fallback>{getInitials(user.name, user.username)}</Avatar.Fallback>
        </Avatar.Root>
      </button>
    </header>
  )
}
