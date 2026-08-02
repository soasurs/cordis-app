import type {
  GuildChannel,
  GuildChannelPermissionOverwrite,
  GuildInvite,
  GuildMember,
  GuildMentionUser,
  GuildRole,
} from '@/api/guild'

export interface GuildSummary {
  createdAt: number
  description: string
  iconAssetId: string
  id: string
  name: string
  ownerId: string
  revision: number
  updatedAt: number
}

export type GuildChannelSummary = GuildChannel
export type GuildChannelOverwriteSummary = GuildChannelPermissionOverwrite
export type GuildInviteSummary = GuildInvite
export type GuildMemberSummary = GuildMember
export type GuildMentionUserSummary = GuildMentionUser
export type GuildRoleSummary = GuildRole
