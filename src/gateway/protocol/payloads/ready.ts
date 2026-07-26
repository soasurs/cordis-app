import type { UserProfilePayload } from '@/gateway/protocol/payloads/user'

// READY snapshot types use snake_case to mirror gateway JSON without remapping.
export interface ReadyRole {
  id: string
  guild_id: string
  name: string
  permissions: string
  position: number
  is_default: boolean
  revision: number
  created_at: number
  updated_at: number
}

export interface ReadyChannel {
  id: string
  guild_id: string
  name: string
  type: number
  position: number
  topic: string
  revision: number
  created_at: number
  updated_at: number
  parent_id?: string
}

export interface ReadyPermissionOverwrite {
  channel_id: string
  guild_id: string
  applies_to: number
  applies_to_id: string
  allow: string
  deny: string
  revision: number
  created_at: number
  updated_at: number
}

export interface ReadyGuild {
  id: string
  owner_id: string
  name: string
  description: string
  icon_asset_id: string
  revision: number
  // Bumps when membership / role access changes independently of guild metadata.
  access_revision: number
  created_at: number
  updated_at: number
  roles: ReadyRole[]
  member_role_ids: string[]
  channels: ReadyChannel[]
  permission_overwrites: ReadyPermissionOverwrite[]
}

export interface ReadyDmChannel {
  id: string
  recipient_id: string
  recipient: UserProfilePayload
  created_at: number
}

export interface ReadyReadState {
  channel_id: string
  last_message_id: string
  last_read_message_id: string
  mention_count: number
}

export interface GatewayReadyData {
  user_id: string
  auth_session_id: string
  session_id: string
  session_node_id: string
  access_token_expires_at: number
  guilds: ReadyGuild[]
  dm_channels: ReadyDmChannel[]
  read_states: ReadyReadState[]
}

export interface GatewayResumedData {
  session_id: string
}
