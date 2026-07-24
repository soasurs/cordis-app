import { createClient } from '@connectrpc/connect'

import { GuildService } from '@/gen/api/v1/guild_pb'

import { apiTransport } from './client'

const guildClient = createClient(GuildService, apiTransport)

export interface Guild {
  createdAt: number
  iconAssetId: string
  id: string
  name: string
  ownerId: string
  revision: number
  updatedAt: number
}

export interface GuildChannel {
  guildId: string
  id: string
  name: string
  parentId?: string
  position: number
  revision: number
  topic: string
  type: number
}

interface CreateTextOrVoiceGuildChannelDetails {
  guildId: string
  name: string
  parentId?: string
  type: 'text' | 'voice'
}

interface CreateGuildCategoryDetails {
  guildId: string
  name: string
  parentId?: never
  type: 'category'
}

export type CreateGuildChannelDetails =
  CreateTextOrVoiceGuildChannelDetails | CreateGuildCategoryDetails

export async function createGuild(name: string): Promise<Guild> {
  const response = await guildClient.createGuild({ name })

  if (!response.guild) {
    throw new Error('create guild response was incomplete')
  }

  return {
    createdAt: Number(response.guild.createdAt),
    iconAssetId: response.guild.iconAssetId.toString(),
    id: response.guild.id.toString(),
    name: response.guild.name,
    ownerId: response.guild.ownerId.toString(),
    revision: Number(response.guild.revision),
    updatedAt: Number(response.guild.updatedAt),
  }
}

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

  const type = { category: 2, text: 1, voice: 3 }[details.type]

  const response = await guildClient.createGuildChannel({
    guildId: BigInt(details.guildId),
    name: details.name,
    parentId: details.parentId ? BigInt(details.parentId) : 0n,
    topic: '',
    type,
  })

  if (!response.channel) {
    throw new Error('create guild channel response was incomplete')
  }

  return toGuildChannel(response.channel)
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
    parentId: channel.parentId > 0n ? channel.parentId.toString() : undefined,
    position: channel.position,
    revision: Number(channel.revision),
    topic: channel.topic,
    type: channel.type,
  }
}

function assertIdentifier(value: string, field: string) {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${field} id is invalid`)
  }
}
