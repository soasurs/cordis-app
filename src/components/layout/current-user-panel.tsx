import * as Avatar from '@radix-ui/react-avatar'

import { resolveAvatarUrl } from '@/api/assets'
import { useGatewayPresencePreference, type GatewayStatus } from '@/app/gateway-context'
import { getInitials, type AppUserSummary } from '@/components/layout/app-shell-types'
import {
  presenceStatusDotClass,
  presenceStatusLabel,
} from '@/features/presence/presence-preference'

export function CurrentUserPanel({
  gatewayStatus,
  onOpenUserSettings,
  user,
}: {
  gatewayStatus: GatewayStatus
  onOpenUserSettings?: () => void
  user: AppUserSummary
}) {
  const initials = getInitials(user.name, user.username)
  const avatarUrl =
    user.userId && user.avatarAssetId
      ? resolveAvatarUrl(user.userId, user.avatarAssetId)
      : undefined
  const connected = gatewayStatus.state === 'ready'
  const { status } = useGatewayPresencePreference()

  return (
    <footer className="m-3 flex items-center gap-3 rounded-panel border border-line bg-surface p-3">
      <div className="relative shrink-0">
        <Avatar.Root className="grid size-9 place-items-center overflow-hidden rounded-control bg-brand-soft text-xs font-bold text-brand-text">
          {avatarUrl ? (
            <Avatar.Image alt="" className="size-full object-cover" src={avatarUrl} />
          ) : null}
          <Avatar.Fallback>{initials}</Avatar.Fallback>
        </Avatar.Root>
        <span
          title={connected ? `Status: ${presenceStatusLabel(status)}` : 'Realtime disconnected'}
          className={`absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-surface ${
            connected ? presenceStatusDotClass(status) : 'bg-subtle'
          }`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{user.name || user.username}</p>
        <p className="truncate text-xs text-subtle">@{user.username}</p>
      </div>
      <button
        type="button"
        aria-label="User settings"
        disabled={!onOpenUserSettings}
        className="text-base text-subtle transition hover:text-ink disabled:cursor-not-allowed"
        onClick={onOpenUserSettings}
      >
        ···
      </button>
    </footer>
  )
}
