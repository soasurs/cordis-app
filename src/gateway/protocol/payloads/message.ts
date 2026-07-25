import type { MessageAuthorPayload } from '@/gateway/protocol/payloads/user'

export interface MessageAttachmentPayload {
  asset_id: string
  filename: string
  size: number
  content_type: string
  width: number
  height: number
  url: string
  url_expires_at: number
}

export interface MessagePayload {
  id: string
  guild_id?: string
  channel_id: string
  user_id?: string
  author: MessageAuthorPayload
  content: string
  type: number
  flags: number
  referenced_message_id?: string
  referenced_channel_id?: string
  attachments: MessageAttachmentPayload[]
  mention_user_ids: string[]
  previous_mention_user_ids?: string[]
  edited_at: number
  created_at: number
  updated_at: number
  revision: number
}

export interface MessageDeletedPayload {
  id: string
  guild_id?: string
  channel_id: string
  user_id?: string
  revision: number
  deleted_at: number
  last_message_id: string
  mention_user_ids: string[]
}

export interface MessageReadUpdatedPayload {
  user_id: string
  channel_id: string
  last_message_id: string
  last_read_message_id: string
  mention_count: number
}
