import type { GatewayPresenceStatus } from '@/gateway'

export const defaultPresenceStatus: GatewayPresenceStatus = 'online'

export const presenceStatusOptions: ReadonlyArray<{
  label: string
  status: GatewayPresenceStatus
}> = [
  { label: 'Online', status: 'online' },
  { label: 'Idle', status: 'idle' },
  { label: 'Do not disturb', status: 'dnd' },
  { label: 'Invisible', status: 'invisible' },
]

const presenceStatusClasses: Record<GatewayPresenceStatus, string> = {
  dnd: 'bg-negative',
  idle: 'bg-warning',
  invisible: 'bg-subtle',
  online: 'bg-positive',
}

export function readPresenceStatus(userId?: string): GatewayPresenceStatus {
  if (!userId || typeof window === 'undefined') {
    return defaultPresenceStatus
  }

  try {
    const value = window.localStorage.getItem(presenceStatusStorageKey(userId))
    return isGatewayPresenceStatus(value) ? value : defaultPresenceStatus
  } catch {
    return defaultPresenceStatus
  }
}

export function writePresenceStatus(
  userId: string | undefined,
  status: GatewayPresenceStatus,
): void {
  if (!userId || typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(presenceStatusStorageKey(userId), status)
  } catch {
    // A blocked or full storage area must not prevent the live status update.
  }
}

export function presenceStatusLabel(status: GatewayPresenceStatus): string {
  return presenceStatusOptions.find((option) => option.status === status)?.label ?? 'Online'
}

export function presenceStatusDotClass(status: GatewayPresenceStatus): string {
  return presenceStatusClasses[status]
}

function presenceStatusStorageKey(userId: string): string {
  return `cordis.presenceStatus.${userId}`
}

function isGatewayPresenceStatus(value: string | null): value is GatewayPresenceStatus {
  return presenceStatusOptions.some((option) => option.status === value)
}
