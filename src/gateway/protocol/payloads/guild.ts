import type { ReadyChannel, ReadyRole } from '@/gateway/protocol/payloads/ready'
import type { UserProfilePayload } from '@/gateway/protocol/payloads/user'

export interface GuildPayload {
  id: string
  owner_id: string
  name: string
  description: string
  icon_asset_id: string
  revision: number
  created_at: number
  updated_at: number
}

export interface GuildDeletedPayload {
  id: string
  revision: number
  deleted_at: number
}

export interface GuildMemberPayload {
  guild_id: string
  user_id: string
  profile: UserProfilePayload
  nickname: string
  revision: number
  joined_at: number
  updated_at: number
}

export interface GuildMemberRemovedPayload {
  guild_id: string
  user_id: string
  revision: number
  removed_at: number
}

export interface GuildMemberBannedPayload {
  guild_id: string
  user_id: string
  actor_user_id: string
  profile: UserProfilePayload
  actor_profile: UserProfilePayload
  reason: string
  banned_at: number
}

export interface GuildMemberUnbannedPayload {
  guild_id: string
  user_id: string
  profile: UserProfilePayload
  unbanned_at: number
}

export type GuildRolePayload = ReadyRole

export interface GuildRoleDeletedPayload {
  id: string
  guild_id: string
  revision: number
  deleted_at: number
}

export interface GuildMemberRolesUpdatedPayload {
  guild_id: string
  user_id: string
  role_ids: string[]
  updated_at: number
}

// Live channel events always include parent_id (may be empty); READY may omit it.
export interface GuildChannelPayload extends Required<ReadyChannel> {
  /** Structural events carry the complete layout token; metadata events may omit it. */
  channel_layout_revision?: number
}

export interface GuildChannelDeletedPayload {
  id: string
  guild_id: string
  revision: number
  deleted_at: number
  channel_layout_revision?: number
}

export interface GuildChannelOverwritePayload {
  channel_id: string
  guild_id: string
  applies_to: number
  applies_to_id: string
  allow: string
  deny: string
  revision: number
  updated_at: number
}

export interface GuildChannelOverwriteDeletedPayload {
  channel_id: string
  guild_id: string
  applies_to: number
  applies_to_id: string
}
