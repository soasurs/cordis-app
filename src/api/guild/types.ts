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
  description: string
  name: string
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
  name: string
  /** Decimal string of the uint64 permission bitmask. */
  permissions: string
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
