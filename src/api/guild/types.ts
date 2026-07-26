import type { PublicUserProfile } from '@/api/user'

// Domain models use decimal strings for snowflake IDs (JSON cannot carry bigint).
export interface Guild {
  createdAt: number
  description: string
  iconAssetId: string
  id: string
  name: string
  ownerId: string
  revision: number
  updatedAt: number
}

export interface UpdateGuildDetails {
  /** Omit when unchanged. Empty string clears the description. */
  description?: string
  /** Omit when unchanged. */
  name?: string
}

export interface CreateGuildIconUploadDetails {
  contentType: string
  expectedSize: number
}

/** Presigned PUT contract; callers must send `requestHeaders` exactly as returned. */
export interface GuildIconUploadContract {
  expiresAt: number
  presignedUrl: string
  requestHeaders: Record<string, string>
  uploadId: string
}

export interface GuildChannel {
  guildId: string
  id: string
  name: string
  parentId?: string
  position: number
  revision: number
  topic: string
  type: number
}

export interface GuildMember {
  guildId: string
  joinedAt: number
  nickname: string
  profile?: PublicUserProfile
  revision: number
  updatedAt: number
  userId: string
}

export interface GuildMemberPage {
  members: GuildMember[]
  nextCursor?: string
}

export interface GuildInvite {
  code: string
  createdAt: number
  creator?: PublicUserProfile
  creatorUserId: string
  /** Unix ms; 0 means the invite never expires. */
  expiresAt: number
  guildId: string
  id: string
  /** 0 means unlimited uses. */
  maxUses: number
  uses: number
}

export interface GuildInvitePage {
  invites: GuildInvite[]
  nextCursor?: string
}

export interface CreateGuildInviteDetails {
  /** Relative lifetime in milliseconds; 0 means never expires. */
  expiresInMs: number
  /** 0 means unlimited uses. */
  maxUses: number
}

export interface GuildInvitePreview {
  code: string
  /** Unix ms; 0 means the invite never expires. */
  expiresAt: number
  guildDescription: string
  guildIconAssetId: string
  guildId: string
  guildName: string
  memberCount: number
}

export interface JoinGuildByInviteResult {
  guild: Guild
  member: GuildMember
}

export interface GuildRole {
  createdAt: number
  guildId: string
  id: string
  isDefault: boolean
  name: string
  /** Decimal string of the uint64 permission bitmask. */
  permissions: string
  position: number
  revision: number
  updatedAt: number
}

export interface GuildRoleDetails {
  /** Required when creating; omit from updates when unchanged. */
  name?: string
  /** Decimal string of the uint64 permission bitmask. Omit from updates when unchanged. */
  permissions?: string
}

export interface GuildRolePosition {
  position: number
  roleId: string
}

interface CreateTextOrVoiceGuildChannelDetails {
  guildId: string
  name: string
  parentId?: string
  type: 'text' | 'voice'
}

// Categories are always root-level; `parentId?: never` rejects nesting at the type level.
interface CreateGuildCategoryDetails {
  guildId: string
  name: string
  parentId?: never
  type: 'category'
}

export type CreateGuildChannelDetails =
  CreateTextOrVoiceGuildChannelDetails | CreateGuildCategoryDetails

export interface GuildChannelPosition {
  channelId: string
  /** Omit to leave parent unchanged; `null` clears parent (moves to root). */
  parentId?: string | null
  position: number
}
