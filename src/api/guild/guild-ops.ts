import { guildClient } from '@/api/guild/client'
import { assertIdentifier } from '@/api/guild/internal'
import type {
  CreateGuildIconUploadDetails,
  Guild,
  GuildIconUploadContract,
  UpdateGuildDetails,
} from '@/api/guild/types'

export async function createGuild(name: string): Promise<Guild> {
  const response = await guildClient.createGuild({ name })

  if (!response.guild) {
    throw new Error('create guild response was incomplete')
  }

  return toGuild(response.guild)
}

export async function updateGuild(guildId: string, details: UpdateGuildDetails): Promise<Guild> {
  assertIdentifier(guildId, 'guild')

  const response = await guildClient.updateGuild({
    description: details.description,
    guildId: BigInt(guildId),
    name: details.name,
  })

  if (!response.guild) {
    throw new Error('update guild response was incomplete')
  }

  return toGuild(response.guild)
}

/**
 * Starts the icon upload handshake. Caller PUTs bytes to `presignedUrl`, then
 * must call `completeGuildIconUpload` (or `abortGuildIconUpload` on failure).
 */
export async function createGuildIconUpload(
  guildId: string,
  details: CreateGuildIconUploadDetails,
): Promise<GuildIconUploadContract> {
  assertIdentifier(guildId, 'guild')
  if (!Number.isInteger(details.expectedSize) || details.expectedSize <= 0) {
    throw new Error('expected upload size is invalid')
  }

  const response = await guildClient.createGuildIconUpload({
    contentType: details.contentType,
    expectedSize: BigInt(details.expectedSize),
    guildId: BigInt(guildId),
  })

  return {
    expiresAt: Number(response.expiresAt),
    presignedUrl: response.presignedUrl,
    // Copy so callers cannot mutate the Connect response object in place.
    requestHeaders: { ...response.requestHeaders },
    uploadId: response.uploadId.toString(),
  }
}

export async function completeGuildIconUpload(guildId: string, uploadId: string): Promise<Guild> {
  assertIdentifier(guildId, 'guild')
  assertIdentifier(uploadId, 'upload')

  const response = await guildClient.completeGuildIconUpload({
    guildId: BigInt(guildId),
    uploadId: BigInt(uploadId),
  })

  if (!response.guild) {
    throw new Error('complete guild icon upload response was incomplete')
  }

  return toGuild(response.guild)
}

export async function abortGuildIconUpload(guildId: string, uploadId: string): Promise<void> {
  assertIdentifier(guildId, 'guild')
  assertIdentifier(uploadId, 'upload')

  await guildClient.abortGuildIconUpload({
    guildId: BigInt(guildId),
    uploadId: BigInt(uploadId),
  })
}

function toGuild(guild: {
  createdAt: bigint
  description: string
  iconAssetId: bigint
  id: bigint
  name: string
  ownerId: bigint
  revision: bigint
  updatedAt: bigint
}): Guild {
  return {
    createdAt: Number(guild.createdAt),
    description: guild.description,
    iconAssetId: guild.iconAssetId.toString(),
    id: guild.id.toString(),
    name: guild.name,
    ownerId: guild.ownerId.toString(),
    revision: Number(guild.revision),
    updatedAt: Number(guild.updatedAt),
  }
}
