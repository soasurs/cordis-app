export interface MessageReplyTarget {
  authorName: string
  channelId: string
  content: string
  contentPreview: string
  id: string
  mentionEveryone: boolean
  mentionRoleIds: string[]
  mentionUserIds: string[]
}

const PREVIEW_MAX = 120

export function toMessageContentPreview(input: {
  attachments: readonly unknown[]
  content: string
}): string {
  const trimmed = input.content.trim()
  if (trimmed) {
    return trimmed.length > PREVIEW_MAX ? `${trimmed.slice(0, PREVIEW_MAX)}…` : trimmed
  }
  if (input.attachments.length > 0) {
    return input.attachments.length === 1 ? 'Attachment' : 'Attachments'
  }
  return 'Message'
}

export function toMessageReplyTarget(message: {
  attachments: readonly unknown[]
  author?: { name?: string; userId?: string; username?: string }
  channelId: string
  content: string
  id: string
  mentionEveryone: boolean
  mentionRoleIds: string[]
  mentionUserIds: string[]
}): MessageReplyTarget {
  const authorName =
    message.author?.name ||
    message.author?.username ||
    (message.author?.userId ? `User ${message.author.userId}` : 'Unknown user')

  return {
    authorName,
    channelId: message.channelId,
    content: message.content,
    contentPreview: toMessageContentPreview(message),
    id: message.id,
    mentionEveryone: message.mentionEveryone,
    mentionRoleIds: message.mentionRoleIds,
    mentionUserIds: message.mentionUserIds,
  }
}
