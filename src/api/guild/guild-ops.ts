import { guildClient } from '@/api/guild/client'
import { assertIdentifier } from '@/api/guild/internal'
import { optionalIdempotencyKey } from '@/api/idempotency'
import { toUploadStatus } from '@/api/assets'
import type {
  CreateGuildIconUploadDetails,
  CreateGuildDetails,
  Guild,
  GuildIconUploadContract,
  UpdateGuildDetails,
} from '@/api/guild/types'

export function createGuild(details: CreateGuildDetails): Promise<Guild>
export function createGuild(
  name: string,
  options?: Pick<CreateGuildDetails, 'idempotencyKey'>,
): Promise<Guild>
export async function createGuild(
  input: string | CreateGuildDetails,
  options: Pick<CreateGuildDetails, 'idempotencyKey'> = {},
): Promise<Guild> {
  const details = typeof input === 'string' ? { name: input, ...options } : input
  const response = await guildClient.createGuild({
    name: details.name,
    ...optionalIdempotencyKey(details.idempotencyKey),
  })

  if (!response.guild) {
    throw new Error('create guild response was incomplete')
  }

  return toGuild(response.guild)
}

export async function updateGuild(guildId: string, details: UpdateGuildDetails): Promise<Guild> {
  assertIdentifier(guildId, 'guild')
  if (details.name === undefined && details.description === undefined) {
    throw new Error('at least one guild field is required')
  }

  const response = await guildClient.updateGuild({
    guildId: BigInt(guildId),
    ...(details.name !== undefined ? { name: details.name } : {}),
    ...(details.description !== undefined ? { description: details.description } : {}),
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
    ...optionalIdempotencyKey(details.idempotencyKey),
  })

  return {
    expiresAt: Number(response.expiresAt),
    idempotentReplay: response.idempotentReplay,
    presignedUrl: response.presignedUrl,
    // Copy so callers cannot mutate the Connect response object in place.
    requestHeaders: { ...response.requestHeaders },
    status: toUploadStatus(response.status),
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
