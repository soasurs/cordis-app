import type { UserPresenceStatus } from '@/api/presence'

const statusLabels: Record<UserPresenceStatus, string> = {
  dnd: 'Do Not Disturb',
  idle: 'Idle',
  offline: 'Offline',
  online: 'Online',
}

export function userPresenceStatusLabel(status: UserPresenceStatus) {
  return statusLabels[status]
}
