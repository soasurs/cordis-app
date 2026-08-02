import type { DmChannel as ProtoDmChannel } from '@/gen/api/v1/message_pb'

import { messageClient } from '@/api/message/client'
import type { DmChannelPage, DmChannelSummary } from '@/api/dm/types'
import { toPublicUserProfile } from '@/api/user'

const DEFAULT_LIST_LIMIT = 50

export async function createDmChannel(targetId: string): Promise<DmChannelSummary> {
  if (!/^[1-9]\d*$/.test(targetId)) {
    throw new Error('target id is invalid')
  }

  const response = await messageClient.createDmChannel({
    targetId: BigInt(targetId),
  })

  if (!response.channel) {
    throw new Error('create dm channel response was incomplete')
  }

  return toDmChannelSummary(response.channel)
}

export async function listDmChannels(cursor?: string): Promise<DmChannelPage> {
  const response = await messageClient.listDmChannels({
    ...(cursor ? { cursor } : {}),
    limit: DEFAULT_LIST_LIMIT,
  })

  return {
    channels: response.channels.map(toDmChannelSummary),
    nextCursor: response.nextCursor || undefined,
  }
}

export function toDmChannelSummary(channel: ProtoDmChannel): DmChannelSummary {
  if (!channel.recipient) {
    throw new Error('dm channel response was incomplete')
  }

  return {
    channelId: channel.id.toString(),
    createdAt: Number(channel.createdAt),
    recipient: toPublicUserProfile(channel.recipient),
  }
}
