import { guildPermission, type GuildRole } from '@/api/guild'
import {
  combineGuildRolePermissions,
  memberHasGuildPermission,
  resolveHeldGuildRoles,
} from '@/features/guilds/components/guild-permissions'
import type { GuildSettingsSection } from '@/features/guilds/guild-settings-types'

/**
 * UI/product capabilities. Most map 1:1 to a guild permission bit.
 * `openGuildSettings` is composite: any settings-section permission grants entry.
 */
export const guildCapabilities = [
  'banMembers',
  'createInvite',
  'kickMembers',
  'manageChannels',
  'manageGuild',
  'manageMembers',
  'manageMessages',
  'manageRoles',
  'openGuildSettings',
  'sendMessages',
  'viewChannels',
] as const

export type GuildCapability = (typeof guildCapabilities)[number]

export interface EffectiveGuildPermissions {
  isOwner: boolean
  permissions: string
}

/** Permission required to use each Community settings section. */
export const guildSettingsSectionCapability = {
  invites: 'createInvite',
  members: 'manageMembers',
  overview: 'manageGuild',
  roles: 'manageRoles',
} as const satisfies Record<GuildSettingsSection, GuildCapability>

const permissionByCapability = {
  banMembers: guildPermission.banMembers,
  createInvite: guildPermission.createInvite,
  kickMembers: guildPermission.kickMembers,
  manageChannels: guildPermission.manageChannels,
  manageGuild: guildPermission.manageGuild,
  manageMembers: guildPermission.manageMembers,
  manageMessages: guildPermission.manageMessages,
  manageRoles: guildPermission.manageRoles,
  sendMessages: guildPermission.sendMessages,
  viewChannels: guildPermission.viewChannel,
} as const satisfies Record<Exclude<GuildCapability, 'openGuildSettings'>, string>

const settingsEntryCapabilities = [
  guildSettingsSectionCapability.overview,
  guildSettingsSectionCapability.roles,
  guildSettingsSectionCapability.members,
  guildSettingsSectionCapability.invites,
] as const

/** Combine ownership with held role masks into effective guild-level permissions. */
export function resolveEffectiveGuildPermissions(input: {
  assignedRoles: GuildRole[]
  guildRoles: GuildRole[]
  isOwner: boolean
}): EffectiveGuildPermissions {
  return {
    isOwner: input.isOwner,
    permissions: combineGuildRolePermissions(
      resolveHeldGuildRoles(input.guildRoles, input.assignedRoles),
    ),
  }
}

/** Whether the effective member may perform a capability. */
export function canGuildCapability(
  effective: EffectiveGuildPermissions,
  capability: GuildCapability,
) {
  if (effective.isOwner) return true

  if (capability === 'openGuildSettings') {
    return settingsEntryCapabilities.some((entry) =>
      memberHasGuildPermission(effective.permissions, permissionByCapability[entry]),
    )
  }

  return memberHasGuildPermission(effective.permissions, permissionByCapability[capability])
}

export function canAccessGuildSettingsSection(
  effective: EffectiveGuildPermissions,
  section: GuildSettingsSection,
) {
  return canGuildCapability(effective, guildSettingsSectionCapability[section])
}
