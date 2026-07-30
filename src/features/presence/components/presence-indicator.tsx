import type { UserPresenceStatus } from '@/api/presence'
import { userPresenceStatusLabel } from '@/features/presence/presence-status'

interface PresenceIndicatorProps {
  status: UserPresenceStatus
}

const statusClasses: Record<UserPresenceStatus, string> = {
  dnd: 'bg-negative',
  idle: 'bg-warning',
  offline: 'bg-muted',
  online: 'bg-positive',
}

export function PresenceIndicator({ status }: PresenceIndicatorProps) {
  return (
    <span
      aria-label={`${userPresenceStatusLabel(status).toLowerCase()} presence`}
      className={`absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-surface-raised ${statusClasses[status]}`}
      role="img"
    />
  )
}
