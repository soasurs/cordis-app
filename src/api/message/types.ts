import type { PublicUserProfile } from '@/api/user'

// Domain models use decimal strings for snowflake IDs (JSON cannot carry bigint).
export interface ChannelMessage {
  author?: PublicUserProfile
  channelId: string
  content: string
  createdAt: number
  /** Non-zero after the message has been edited. */
  editedAt: number
  flags: number
  id: string
  referencedChannelId?: string
  referencedMessageId?: string
  revision: number
  type: number
  updatedAt: number
}

export interface ChannelMessagePage {
  /** Largest message ID in this page, or undefined when the page is empty. */
  afterCursor?: string
  /** Smallest message ID in this page; used as `before` for older pages. */
  beforeCursor?: string
  messages: ChannelMessage[]
}

export interface CreateChannelMessageDetails {
  channelId: string
  content: string
}

export interface UpdateChannelMessageDetails {
  content: string
}

export interface ListChannelMessagesOptions {
  /** Load messages older than this ID (exclusive). */
  before?: string
  limit?: number
}
