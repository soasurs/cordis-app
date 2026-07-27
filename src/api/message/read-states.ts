import {
  ReadStateScopeType,
  type ChannelReadState as ProtoChannelReadState,
} from '@/gen/api/v1/message_pb'

import { assertIdentifier } from '@/api/message/internal'
import { messageClient } from '@/api/message/client'
import type { ChannelReadStateSummary } from '@/api/message/types'

export async function ackMessage(
  channelId: string,
  messageId: string,
): Promise<ChannelReadStateSummary> {
  assertIdentifier(channelId, 'channel')
  assertIdentifier(messageId, 'message')

  const response = await messageClient.ackMessage({
    channelId: BigInt(channelId),
    messageId: BigInt(messageId),
  })

  if (!response.readState) {
    throw new Error('ack message response was incomplete')
  }

  return toChannelReadState(response.readState)
}

export async function getReadStatesForGuild(guildId: string): Promise<ChannelReadStateSummary[]> {
  assertIdentifier(guildId, 'guild')

  const response = await messageClient.getReadStates({
    guildId: BigInt(guildId),
    scope: ReadStateScopeType.GUILD,
  })

  return response.readStates.map(toChannelReadState)
}

export function toChannelReadState(state: ProtoChannelReadState): ChannelReadStateSummary {
  return {
    channelId: state.channelId.toString(),
    lastMessageId: state.lastMessageId.toString(),
    lastReadMessageId: state.lastReadMessageId.toString(),
    mentionCount: state.mentionCount,
  }
}
