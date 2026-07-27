import { guildPermission } from '@/api/guild/permissions'

/** Role bits that change which channels the server returns for the current member. */
const roleVisibilityPermissions = [
  guildPermission.administrator,
  guildPermission.viewChannel,
] as const

/** Overwrites may only carry channel bits; View Channel alone affects listing. */
const overwriteVisibilityPermission = guildPermission.viewChannel

function permissionMaskTouches(permissions: string, flags: readonly string[]) {
  const mask = BigInt(permissions)
  return flags.some((permission) => (mask & BigInt(permission)) !== 0n)
}

function permissionMasksDiffer(previous: string, next: string, flags: readonly string[]) {
  const previousMask = BigInt(previous)
  const nextMask = BigInt(next)
  return flags.some((permission) => {
    const flag = BigInt(permission)
    return (previousMask & flag) !== (nextMask & flag)
  })
}

/** True when a role permission mask change can alter the visible channel set. */
export function rolePermissionsAffectVisibleChannels(previous: string, next: string) {
  return permissionMasksDiffer(previous, next, roleVisibilityPermissions)
}

/**
 * True when an overwrite create/update can alter the visible channel set.
 * Pass `previous` as undefined for a newly created overwrite entry.
 */
export function channelOverwriteAffectsVisibleChannels(
  previous: { allow: string; deny: string } | undefined,
  next: { allow: string; deny: string },
) {
  const flags = [overwriteVisibilityPermission]
  if (!previous) {
    return permissionMaskTouches(next.allow, flags) || permissionMaskTouches(next.deny, flags)
  }

  return (
    permissionMasksDiffer(previous.allow, next.allow, flags) ||
    permissionMasksDiffer(previous.deny, next.deny, flags)
  )
}

/** True when deleting this overwrite can alter the visible channel set. */
export function channelOverwriteRemovalAffectsVisibleChannels(overwrite: {
  allow: string
  deny: string
}) {
  const flags = [overwriteVisibilityPermission]
  return (
    permissionMaskTouches(overwrite.allow, flags) || permissionMaskTouches(overwrite.deny, flags)
  )
}
