import type { PublicUserProfile } from '@/api/user'

// Domain models use decimal strings for snowflake IDs (JSON cannot carry bigint).
export interface MessageAttachment {
  assetId: string
  contentType: string
  filename: string
  height: number
  size: number
  url: string
  /** Zero for public URLs; otherwise Unix ms. */
  urlExpiresAt: number
  width: number
}

export interface ChannelMessage {
  attachments: MessageAttachment[]
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
  /** Completed attachment asset IDs from CompleteAttachmentUpload. */
  attachmentAssetIds?: string[]
  channelId: string
  content: string
}

export interface UpdateChannelMessageDetails {
  /**
   * When set (including an empty array), replaces the complete attachment list.
   * Omit to leave existing attachments unchanged.
   */
  attachmentAssetIds?: string[]
  content: string
}

export interface ListChannelMessagesOptions {
  /** Load messages older than this ID (exclusive). */
  before?: string
  limit?: number
}

export interface CreateAttachmentUploadDetails {
  contentType: string
  expectedSize: number
  filename: string
}

/** Presigned PUT contract; callers must send `requestHeaders` exactly as returned. */
export interface AttachmentUploadContract {
  expiresAt: number
  presignedUrl: string
  requestHeaders: Record<string, string>
  uploadId: string
}
