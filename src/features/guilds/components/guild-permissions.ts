import { guildPermission } from '@/api/guild'

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
      {
        description: 'Create, update, reorder, and delete roles.',
        label: 'Manage roles',
        value: guildPermission.manageRoles,
      },
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
      {
        description: 'Create invitation links for this community.',
        label: 'Create invites',
        value: guildPermission.createInvite,
      },
    ],
  },
  {
    id: 'channels',
    label: 'Channels',
    permissions: [
      {
        description: 'See channels that are available to this role.',
        label: 'View channels',
        value: guildPermission.viewChannel,
      },
      {
        description: 'Send messages in channels this role can access.',
        label: 'Send messages',
        value: guildPermission.sendMessages,
      },
      {
        description: 'Create, update, reorder, and delete channels.',
        label: 'Manage channels',
        value: guildPermission.manageChannels,
      },
      {
        description: 'Moderate messages sent by other members.',
        label: 'Manage messages',
        value: guildPermission.manageMessages,
      },
    ],
  },
] as const

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

export function toggleGuildPermission(
  rolePermissions: string,
  permission: string,
  granted: boolean,
) {
  const current = BigInt(rolePermissions)
  const flag = BigInt(permission)
  return (granted ? current | flag : current & ~flag).toString()
}
