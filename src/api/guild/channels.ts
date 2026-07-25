import { GuildChannelType } from '@/gen/api/v1/guild_pb'

import { guildClient } from '@/api/guild/client'
import { assertIdentifier } from '@/api/guild/internal'
import type {
  CreateGuildChannelDetails,
  GuildChannel,
  GuildChannelPosition,
} from '@/api/guild/types'

export async function listGuildChannels(guildId: string): Promise<GuildChannel[]> {
  assertIdentifier(guildId, 'guild')

  const response = await guildClient.listGuildChannels({ guildId: BigInt(guildId) })

  return response.channels.map(toGuildChannel)
}

export async function createGuildChannel(
  details: CreateGuildChannelDetails,
): Promise<GuildChannel> {
  assertIdentifier(details.guildId, 'guild')
  if (details.parentId) assertIdentifier(details.parentId, 'parent channel')

  const type = {
    category: GuildChannelType.CATEGORY,
    text: GuildChannelType.TEXT,
    voice: GuildChannelType.VOICE,
  }[details.type]

  const response = await guildClient.createGuildChannel({
    guildId: BigInt(details.guildId),
    name: details.name,
    // Proto uses 0 as "no parent"; the app model maps that to `undefined`.
    parentId: details.parentId ? BigInt(details.parentId) : 0n,
    topic: '',
    type,
  })

  if (!response.channel) {
    throw new Error('create guild channel response was incomplete')
  }

  return toGuildChannel(response.channel)
}

export async function reorderGuildChannels(
  guildId: string,
  positions: GuildChannelPosition[],
): Promise<GuildChannel[]> {
  assertIdentifier(guildId, 'guild')
  for (const item of positions) {
    assertIdentifier(item.channelId, 'channel')
    if (item.parentId) assertIdentifier(item.parentId, 'parent channel')
    if (!Number.isInteger(item.position) || item.position < 0) {
      throw new Error('channel position is invalid')
    }
  }

  const response = await guildClient.reorderGuildChannels({
    guildId: BigInt(guildId),
    positions: positions.map((item) => ({
      channelId: BigInt(item.channelId),
      // undefined = omit field (keep current parent); null = clear parent via 0n.
      ...(item.parentId !== undefined
        ? { parentId: item.parentId === null ? 0n : BigInt(item.parentId) }
        : {}),
      position: item.position,
    })),
  })

  return response.channels.map(toGuildChannel)
}

function toGuildChannel(channel: {
  guildId: bigint
  id: bigint
  name: string
  parentId: bigint
  position: number
  revision: bigint
  topic: string
  type: number
}): GuildChannel {
  return {
    guildId: channel.guildId.toString(),
    id: channel.id.toString(),
    name: channel.name,
    // Proto sentinel 0 means root / no parent.
    parentId: channel.parentId > 0n ? channel.parentId.toString() : undefined,
    position: channel.position,
    revision: Number(channel.revision),
    topic: channel.topic,
    type: channel.type,
  }
}
