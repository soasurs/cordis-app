import type { PresignedUploadContract } from '@/api/assets'
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

export interface CreateGuildDetails {
  idempotencyKey?: string
  name: string
}

export interface CreateGuildIconUploadDetails {
  contentType: string
  expectedSize: number
  idempotencyKey?: string
}

/** Presigned PUT contract; callers must send `requestHeaders` exactly as returned. */
export type GuildIconUploadContract = PresignedUploadContract

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

export interface GuildChannelList {
  channelLayoutRevision: number
  channels: GuildChannel[]
}

export interface GuildChannelMutationResult {
  channel: GuildChannel
  /** Present when the mutation changed the guild channel layout. */
  channelLayoutRevision?: number
}

export interface DeleteGuildChannelResult {
  channelLayoutRevision: number
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

/** A member returned by the channel-aware mention search endpoint. */
export interface GuildMentionUser {
  avatarAssetId: string
  name: string
  nickname: string
  userId: string
  username: string
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
  idempotencyKey?: string
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
  /** Optional key identifying one role creation intent. */
  idempotencyKey?: string
}

export interface GuildRolePosition {
  position: number
  roleId: string
}

interface CreateTextOrVoiceGuildChannelDetails {
  expectedChannelLayoutRevision: number
  guildId: string
  idempotencyKey?: string
  name: string
  parentId?: string
  type: 'text' | 'voice'
}

// Categories are always root-level; `parentId?: never` rejects nesting at the type level.
interface CreateGuildCategoryDetails {
  expectedChannelLayoutRevision: number
  guildId: string
  idempotencyKey?: string
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

export interface UpdateGuildChannelDetails {
  /** Omit when unchanged. */
  name?: string
  /**
   * Omit when unchanged. `null` clears parent (moves to root); omit to leave
   * parent unchanged.
   */
  parentId?: string | null
  /** Required when changing the parent; omit for metadata-only updates. */
  expectedChannelLayoutRevision?: number
  /** Omit when unchanged. Empty string clears the topic. */
  topic?: string
}

export type GuildChannelPermissionOverwriteAppliesTo = 'member' | 'role'

export interface GuildChannelPermissionOverwrite {
  allow: string
  appliesTo: GuildChannelPermissionOverwriteAppliesTo
  appliesToId: string
  channelId: string
  createdAt: number
  deny: string
  guildId: string
  revision: number
  updatedAt: number
}

export interface UpsertGuildChannelPermissionOverwriteDetails {
  allow: string
  appliesTo: GuildChannelPermissionOverwriteAppliesTo
  appliesToId: string
  deny: string
}
