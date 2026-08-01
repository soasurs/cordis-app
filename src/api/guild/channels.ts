import { GuildChannelType, GuildPermissionOverwriteType } from '@/gen/api/v1/guild_pb'

import { guildClient } from '@/api/guild/client'
import { assertIdentifier } from '@/api/guild/internal'
import { optionalIdempotencyKey } from '@/api/idempotency'
import type {
  CreateGuildChannelDetails,
  DeleteGuildChannelResult,
  GuildChannel,
  GuildChannelList,
  GuildChannelPermissionOverwrite,
  GuildChannelPermissionOverwriteAppliesTo,
  GuildChannelPosition,
  GuildChannelMutationResult,
  UpdateGuildChannelDetails,
  UpsertGuildChannelPermissionOverwriteDetails,
} from '@/api/guild/types'

export async function listGuildChannels(guildId: string): Promise<GuildChannelList> {
  assertIdentifier(guildId, 'guild')

  const response = await guildClient.listGuildChannels({ guildId: BigInt(guildId) })

  return {
    channelLayoutRevision: toChannelLayoutRevision(response.channelLayoutRevision),
    channels: response.channels.map(toGuildChannel),
  }
}

export async function createGuildChannel(
  details: CreateGuildChannelDetails,
): Promise<GuildChannelMutationResult> {
  assertIdentifier(details.guildId, 'guild')
  if (details.parentId) assertIdentifier(details.parentId, 'parent channel')
  assertChannelLayoutRevision(details.expectedChannelLayoutRevision)

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
    expectedChannelLayoutRevision: BigInt(details.expectedChannelLayoutRevision),
    ...optionalIdempotencyKey(details.idempotencyKey),
  })

  if (!response.channel) {
    throw new Error('create guild channel response was incomplete')
  }

  return {
    channel: toGuildChannel(response.channel),
    channelLayoutRevision: toChannelLayoutRevision(response.channelLayoutRevision),
  }
}

export async function updateGuildChannel(
  channelId: string,
  details: UpdateGuildChannelDetails,
): Promise<GuildChannelMutationResult> {
  assertIdentifier(channelId, 'channel')
  if (details.parentId) assertIdentifier(details.parentId, 'parent channel')
  if (details.name === undefined && details.topic === undefined && details.parentId === undefined) {
    throw new Error('at least one channel field is required')
  }
  if (details.parentId !== undefined) {
    assertChannelLayoutRevision(details.expectedChannelLayoutRevision)
  }

  const response = await guildClient.updateGuildChannel({
    channelId: BigInt(channelId),
    ...(details.name !== undefined ? { name: details.name } : {}),
    ...(details.topic !== undefined ? { topic: details.topic } : {}),
    ...(details.parentId !== undefined
      ? { parentId: details.parentId === null ? 0n : BigInt(details.parentId) }
      : {}),
    ...(details.parentId !== undefined
      ? { expectedChannelLayoutRevision: BigInt(details.expectedChannelLayoutRevision!) }
      : {}),
  })

  if (!response.channel) {
    throw new Error('update guild channel response was incomplete')
  }

  return {
    channel: toGuildChannel(response.channel),
    channelLayoutRevision: toOptionalChannelLayoutRevision(response.channelLayoutRevision),
  }
}

export async function reorderGuildChannels(
  guildId: string,
  positions: GuildChannelPosition[],
  expectedChannelLayoutRevision: number,
): Promise<GuildChannelList> {
  assertIdentifier(guildId, 'guild')
  assertChannelLayoutRevision(expectedChannelLayoutRevision)
  for (const item of positions) {
    assertIdentifier(item.channelId, 'channel')
    if (item.parentId) assertIdentifier(item.parentId, 'parent channel')
    if (!Number.isInteger(item.position) || item.position < 0) {
      throw new Error('channel position is invalid')
    }
  }

  const response = await guildClient.reorderGuildChannels({
    guildId: BigInt(guildId),
    expectedChannelLayoutRevision: BigInt(expectedChannelLayoutRevision),
    positions: positions.map((item) => ({
      channelId: BigInt(item.channelId),
      // undefined = omit field (keep current parent); null = clear parent via 0n.
      ...(item.parentId !== undefined
        ? { parentId: item.parentId === null ? 0n : BigInt(item.parentId) }
        : {}),
      position: item.position,
    })),
  })

  return {
    channelLayoutRevision: toChannelLayoutRevision(response.channelLayoutRevision),
    channels: response.channels.map(toGuildChannel),
  }
}

export async function deleteGuildChannel(
  channelId: string,
  expectedChannelLayoutRevision: number,
): Promise<DeleteGuildChannelResult> {
  assertIdentifier(channelId, 'channel')
  assertChannelLayoutRevision(expectedChannelLayoutRevision)

  const response = await guildClient.deleteGuildChannel({
    channelId: BigInt(channelId),
    expectedChannelLayoutRevision: BigInt(expectedChannelLayoutRevision),
  })

  if (!response.ok) {
    throw new Error('delete guild channel was not accepted')
  }

  return {
    channelLayoutRevision: toChannelLayoutRevision(response.channelLayoutRevision),
  }
}

export async function listGuildChannelPermissionOverwrites(
  channelId: string,
): Promise<GuildChannelPermissionOverwrite[]> {
  assertIdentifier(channelId, 'channel')

  const response = await guildClient.listGuildChannelPermissionOverwrites({
    channelId: BigInt(channelId),
  })

  return response.overwrites.map(toGuildChannelPermissionOverwrite)
}

export async function upsertGuildChannelPermissionOverwrite(
  channelId: string,
  details: UpsertGuildChannelPermissionOverwriteDetails,
): Promise<GuildChannelPermissionOverwrite> {
  assertIdentifier(channelId, 'channel')
  assertIdentifier(details.appliesToId, details.appliesTo === 'role' ? 'role' : 'user')
  if (!/^\d+$/.test(details.allow) || !/^\d+$/.test(details.deny)) {
    throw new Error('overwrite permission bits are invalid')
  }
  const allow = BigInt(details.allow)
  const deny = BigInt(details.deny)
  if ((allow & deny) !== 0n) {
    throw new Error('overwrite allow and deny bits must be disjoint')
  }

  const response = await guildClient.upsertGuildChannelPermissionOverwrite({
    allow,
    appliesTo: toProtoOverwriteAppliesTo(details.appliesTo),
    appliesToId: BigInt(details.appliesToId),
    channelId: BigInt(channelId),
    deny,
  })

  if (!response.overwrite) {
    throw new Error('upsert channel permission overwrite response was incomplete')
  }

  return toGuildChannelPermissionOverwrite(response.overwrite)
}

export async function deleteGuildChannelPermissionOverwrite(
  channelId: string,
  details: {
    appliesTo: GuildChannelPermissionOverwriteAppliesTo
    appliesToId: string
  },
): Promise<void> {
  assertIdentifier(channelId, 'channel')
  assertIdentifier(details.appliesToId, details.appliesTo === 'role' ? 'role' : 'user')

  const response = await guildClient.deleteGuildChannelPermissionOverwrite({
    appliesTo: toProtoOverwriteAppliesTo(details.appliesTo),
    appliesToId: BigInt(details.appliesToId),
    channelId: BigInt(channelId),
  })

  if (!response.ok) {
    throw new Error('delete channel permission overwrite failed')
  }
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

function assertChannelLayoutRevision(value: number | undefined): asserts value is number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error('channel layout revision is invalid')
  }
}

function toChannelLayoutRevision(value: bigint): number {
  const revision = Number(value)
  if (!Number.isSafeInteger(revision) || revision <= 0) {
    throw new Error('channel layout revision response is invalid')
  }
  return revision
}

function toOptionalChannelLayoutRevision(value: bigint): number | undefined {
  if (value === 0n) return undefined
  return toChannelLayoutRevision(value)
}

function toGuildChannelPermissionOverwrite(overwrite: {
  allow: bigint
  appliesTo: GuildPermissionOverwriteType
  appliesToId: bigint
  channelId: bigint
  createdAt: bigint
  deny: bigint
  guildId: bigint
  revision: bigint
  updatedAt: bigint
}): GuildChannelPermissionOverwrite {
  return {
    allow: overwrite.allow.toString(),
    appliesTo: toOverwriteAppliesTo(overwrite.appliesTo),
    appliesToId: overwrite.appliesToId.toString(),
    channelId: overwrite.channelId.toString(),
    createdAt: Number(overwrite.createdAt),
    deny: overwrite.deny.toString(),
    guildId: overwrite.guildId.toString(),
    revision: Number(overwrite.revision),
    updatedAt: Number(overwrite.updatedAt),
  }
}

function toOverwriteAppliesTo(
  value: GuildPermissionOverwriteType,
): GuildChannelPermissionOverwriteAppliesTo {
  if (value === GuildPermissionOverwriteType.ROLE) return 'role'
  if (value === GuildPermissionOverwriteType.MEMBER) return 'member'
  throw new Error('permission overwrite applies_to is invalid')
}

function toProtoOverwriteAppliesTo(value: GuildChannelPermissionOverwriteAppliesTo) {
  return value === 'role' ? GuildPermissionOverwriteType.ROLE : GuildPermissionOverwriteType.MEMBER
}
