import type { UserProfilePayload } from '@/gateway/protocol/payloads/user'

export interface RelationshipPayload {
  user_id: string
  target_id: string
  profile: UserProfilePayload
  type: number
  created_at: number
  updated_at: number
}

export interface RelationshipRemovedPayload {
  user_id: string
  target_id: string
}

export interface DmChannelCreatedPayload {
  channel_id: string
  user_id: string
  recipient_id: string
  recipient: UserProfilePayload
  created_at: number
}

export interface PresenceUpdatedPayload {
  user_id: string
  status: number
  changed_at: number
  version: string
  guild_ids: string[]
}

export interface SessionReconcilePayload {
  guild_id: string
  channel_id: string
}
