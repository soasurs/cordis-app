import { guildPermission, type GuildChannelPermissionOverwrite, type GuildRole } from '@/api/guild'

export interface GuildPermissionItem {
  description: string
  label: string
  value: string
}

export interface GuildPermissionGroup {
  id: string
  label: string
  permissions: readonly GuildPermissionItem[]
}

const viewChannelsPermission = {
  description: 'See channels that are available to this role.',
  label: 'View channels',
  value: guildPermission.viewChannel,
} as const satisfies GuildPermissionItem

const sendMessagesPermission = {
  description: 'Send messages in channels this role can access.',
  label: 'Send messages',
  value: guildPermission.sendMessages,
} as const satisfies GuildPermissionItem

const mentionEveryonePermission = {
  description: 'Mention @everyone and roles in channels this role can access.',
  label: 'Mention @everyone and roles',
  value: guildPermission.mentionEveryone,
} as const satisfies GuildPermissionItem

const manageChannelsPermission = {
  description: 'Create, update, reorder, and delete channels.',
  label: 'Manage channels',
  value: guildPermission.manageChannels,
} as const satisfies GuildPermissionItem

const manageRolesPermission = {
  description: 'Create, update, reorder, and delete roles.',
  label: 'Manage roles',
  value: guildPermission.manageRoles,
} as const satisfies GuildPermissionItem

const manageMessagesPermission = {
  description: 'Moderate messages sent by other members.',
  label: 'Manage messages',
  value: guildPermission.manageMessages,
} as const satisfies GuildPermissionItem

const createInvitesPermission = {
  description: 'Create invitation links for this community.',
  label: 'Create invites',
  value: guildPermission.createInvite,
} as const satisfies GuildPermissionItem

export const guildPermissionGroups = [
  {
    id: 'general',
    label: 'General',
    permissions: [
      {
        description: 'Grants every permission and bypasses channel-specific restrictions.',
        label: 'Administrator',
        value: guildPermission.administrator,
      },
      {
        description: 'Change community-wide settings and identity.',
        label: 'Manage community',
        value: guildPermission.manageGuild,
      },
      manageRolesPermission,
    ],
  },
  {
    id: 'members',
    label: 'Members',
    permissions: [
      {
        description: 'Manage member-specific community settings.',
        label: 'Manage members',
        value: guildPermission.manageMembers,
      },
      {
        description: 'Remove members from the community.',
        label: 'Kick members',
        value: guildPermission.kickMembers,
      },
      {
        description: 'Ban members and manage the community ban list.',
        label: 'Ban members',
        value: guildPermission.banMembers,
      },
      createInvitesPermission,
    ],
  },
  {
    id: 'channels',
    label: 'Channels',
    permissions: [
      viewChannelsPermission,
      sendMessagesPermission,
      mentionEveryonePermission,
      manageChannelsPermission,
      manageMessagesPermission,
    ],
  },
] satisfies readonly GuildPermissionGroup[]

/**
 * Permissions that can be meaningfully allow/deny'd on a single channel.
 * Guild-scoped flags (Administrator, Manage community, Kick/Ban, etc.) are
 * excluded — they only apply at the community level.
 *
 * Manage roles is included under Discord’s channel-side alias: the same bit
 * grants “Manage permissions” for this channel’s overwrites.
 */
export const channelPermissionGroups = [
  {
    id: 'general',
    label: 'General',
    permissions: [
      {
        ...viewChannelsPermission,
        description: 'See this channel in the sidebar.',
      },
      {
        ...manageChannelsPermission,
        description: "Edit this channel's settings and delete it.",
      },
      {
        ...manageRolesPermission,
        description: 'Edit permission overwrites for this channel.',
        label: 'Manage permissions',
      },
      {
        ...createInvitesPermission,
        description: 'Create invitation links that land in this channel.',
      },
    ],
  },
  {
    id: 'text',
    label: 'Text',
    permissions: [
      {
        ...sendMessagesPermission,
        description: 'Send messages in this channel.',
      },
      {
        ...mentionEveryonePermission,
        description: 'Mention @everyone and roles in this channel.',
      },
      {
        ...manageMessagesPermission,
        description: 'Delete messages sent by other members in this channel.',
      },
    ],
  },
] satisfies readonly GuildPermissionGroup[]

export function countGuildPermissions(value: string) {
  let permissions = BigInt(value)
  let count = 0
  while (permissions > 0n) {
    count += Number(permissions & 1n)
    permissions >>= 1n
  }
  return count
}

export function hasGuildPermission(rolePermissions: string, permission: string) {
  return (BigInt(rolePermissions) & BigInt(permission)) !== 0n
}

/**
 * True when the member is the guild owner, holds Administrator, or holds the
 * specific flag. Ownership grants every guild permission.
 */
export function memberHasGuildPermission(
  permissions: string,
  permission: string,
  options?: { isOwner?: boolean },
) {
  if (options?.isOwner) return true
  return (
    hasGuildPermission(permissions, guildPermission.administrator) ||
    hasGuildPermission(permissions, permission)
  )
}

/**
 * Roles a member effectively holds: every default (@everyone) role plus any
 * explicitly assigned roles. Assigned entries are resolved against the guild
 * role list when present so permission bits stay current.
 */
export function resolveHeldGuildRoles(guildRoles: GuildRole[], assignedRoles: GuildRole[]) {
  const byId = new Map(guildRoles.map((role) => [role.id, role]))
  const held = new Map<string, GuildRole>()

  for (const role of guildRoles) {
    if (role.isDefault) {
      held.set(role.id, role)
    }
  }

  for (const role of assignedRoles) {
    held.set(role.id, byId.get(role.id) ?? role)
  }

  return [...held.values()]
}

/** Bitwise OR of every held role's permission mask. */
export function combineGuildRolePermissions(roles: GuildRole[]) {
  return roles.reduce((permissions, role) => permissions | BigInt(role.permissions), 0n).toString()
}

/**
 * Applies a member's channel overwrites using the same precedence as Guild:
 * @everyone, aggregated assigned roles, then the member-specific overwrite.
 */
export function resolveEffectiveGuildChannelPermissions(input: {
  guildId: string
  isOwner: boolean
  memberRoles: GuildRole[]
  overwrites: GuildChannelPermissionOverwrite[]
  permissions: string
  userId: string
}) {
  if (input.isOwner || hasGuildPermission(input.permissions, guildPermission.administrator)) {
    return input.permissions
  }

  let permissions = BigInt(input.permissions)
  const defaultOverwrite = input.overwrites.find(
    (overwrite) => overwrite.appliesTo === 'role' && overwrite.appliesToId === input.guildId,
  )
  if (defaultOverwrite) {
    permissions = applyChannelOverwrite(permissions, defaultOverwrite)
  }

  const assignedRoleIds = new Set(
    input.memberRoles.filter((role) => !role.isDefault).map((role) => role.id),
  )
  let roleDeny = 0n
  let roleAllow = 0n
  for (const overwrite of input.overwrites) {
    if (overwrite.appliesTo !== 'role' || !assignedRoleIds.has(overwrite.appliesToId)) {
      continue
    }
    roleDeny |= BigInt(overwrite.deny)
    roleAllow |= BigInt(overwrite.allow)
  }
  permissions = (permissions & ~roleDeny) | roleAllow

  const memberOverwrite = input.overwrites.find(
    (overwrite) => overwrite.appliesTo === 'member' && overwrite.appliesToId === input.userId,
  )
  if (memberOverwrite) {
    permissions = applyChannelOverwrite(permissions, memberOverwrite)
  }

  if (!hasGuildPermission(permissions.toString(), guildPermission.viewChannel)) {
    permissions &= ~(BigInt(guildPermission.sendMessages) | BigInt(guildPermission.manageMessages))
  }
  return permissions.toString()
}

function applyChannelOverwrite(permissions: bigint, overwrite: GuildChannelPermissionOverwrite) {
  return (permissions & ~BigInt(overwrite.deny)) | BigInt(overwrite.allow)
}

export function toggleGuildPermission(
  rolePermissions: string,
  permission: string,
  granted: boolean,
) {
  const current = BigInt(rolePermissions)
  const flag = BigInt(permission)
  return (granted ? current | flag : current & ~flag).toString()
}

export type ChannelOverwritePermissionState = 'allow' | 'deny' | 'noop'

export function getChannelOverwritePermissionState(
  allow: string,
  deny: string,
  permission: string,
): ChannelOverwritePermissionState {
  if (hasGuildPermission(allow, permission)) return 'allow'
  if (hasGuildPermission(deny, permission)) return 'deny'
  return 'noop'
}

export function setChannelOverwritePermissionState(
  allow: string,
  deny: string,
  permission: string,
  state: ChannelOverwritePermissionState,
): { allow: string; deny: string } {
  const flag = BigInt(permission)
  let nextAllow = BigInt(allow) & ~flag
  let nextDeny = BigInt(deny) & ~flag
  if (state === 'allow') nextAllow |= flag
  if (state === 'deny') nextDeny |= flag
  return {
    allow: nextAllow.toString(),
    deny: nextDeny.toString(),
  }
}
