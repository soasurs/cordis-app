import { GuildPermission } from '@/gen/api/v1/guild_pb'

// Stored as decimal strings so UI code can OR/AND bitmasks without floating-point loss.
export const guildPermission = {
  administrator: String(GuildPermission.ADMINISTRATOR),
  banMembers: String(GuildPermission.BAN_MEMBERS),
  createInvite: String(GuildPermission.CREATE_INVITE),
  kickMembers: String(GuildPermission.KICK_MEMBERS),
  manageChannels: String(GuildPermission.MANAGE_CHANNELS),
  manageGuild: String(GuildPermission.MANAGE_GUILD),
  manageMembers: String(GuildPermission.MANAGE_MEMBERS),
  manageMessages: String(GuildPermission.MANAGE_MESSAGES),
  manageRoles: String(GuildPermission.MANAGE_ROLES),
  mentionEveryone: String(GuildPermission.MENTION_EVERYONE),
  sendMessages: String(GuildPermission.SEND_MESSAGES),
  viewChannel: String(GuildPermission.VIEW_CHANNEL),
} as const
