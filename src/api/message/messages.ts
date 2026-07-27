import { MessageType, type Message as ProtoMessage } from '@/gen/api/v1/message_pb'

import { assertIdentifier } from '@/api/message/internal'
import { messageClient } from '@/api/message/client'
import type {
  ChannelMessage,
  ChannelMessagePage,
  CreateChannelMessageDetails,
  ListChannelMessagesOptions,
  UpdateChannelMessageDetails,
} from '@/api/message/types'
import { toPublicUserProfile } from '@/api/user'

const DEFAULT_LIST_LIMIT = 50

export async function listMessages(
  channelId: string,
  options: ListChannelMessagesOptions = {},
): Promise<ChannelMessagePage> {
  assertIdentifier(channelId, 'channel')
  if (options.before) assertIdentifier(options.before, 'before cursor')

  const limit = options.limit ?? DEFAULT_LIST_LIMIT
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('message list limit is invalid')
  }

  const response = await messageClient.listMessages({
    channelId: BigInt(channelId),
    limit,
    ...(options.before
      ? { cursor: { case: 'before' as const, value: BigInt(options.before) } }
      : {}),
  })

  return {
    afterCursor: optionalCursor(response.afterCursor),
    beforeCursor: optionalCursor(response.beforeCursor),
    messages: response.messages.map(toChannelMessage),
  }
}

export async function createMessage(
  details: CreateChannelMessageDetails,
): Promise<ChannelMessage> {
  assertIdentifier(details.channelId, 'channel')
  const content = details.content.trim()
  if (!content) {
    throw new Error('message content is required')
  }

  const response = await messageClient.createMessage({
    channelId: BigInt(details.channelId),
    content,
    type: MessageType.DEFAULT,
  })

  if (!response.message) {
    throw new Error('create message response was incomplete')
  }

  return toChannelMessage(response.message)
}

export async function updateMessage(
  messageId: string,
  details: UpdateChannelMessageDetails,
): Promise<ChannelMessage> {
  assertIdentifier(messageId, 'message')
  const content = details.content.trim()
  if (!content) {
    throw new Error('message content is required')
  }

  const response = await messageClient.updateMessage({
    messageId: BigInt(messageId),
    content,
  })

  if (!response.message) {
    throw new Error('update message response was incomplete')
  }

  return toChannelMessage(response.message)
}

export async function deleteMessage(messageId: string): Promise<void> {
  assertIdentifier(messageId, 'message')

  await messageClient.deleteMessage({
    messageId: BigInt(messageId),
  })
}

export function toChannelMessage(message: ProtoMessage): ChannelMessage {
  return {
    author: message.author ? toPublicUserProfile(message.author) : undefined,
    channelId: message.channelId.toString(),
    content: message.content,
    createdAt: Number(message.createdAt),
    editedAt: Number(message.editedAt),
    flags: message.flags,
    id: message.id.toString(),
    referencedChannelId: optionalId(message.referencedChannelId),
    referencedMessageId: optionalId(message.referencedMessageId),
    revision: Number(message.revision),
    type: message.type,
    updatedAt: Number(message.updatedAt),
  }
}

function optionalId(value: bigint): string | undefined {
  return value === 0n ? undefined : value.toString()
}

function optionalCursor(value: bigint): string | undefined {
  return value === 0n ? undefined : value.toString()
}
