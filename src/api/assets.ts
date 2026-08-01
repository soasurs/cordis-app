import { UploadStatus as UploadStatusProto } from '@/gen/api/v1/media_pb'

const PUBLIC_BUCKET = 'cordis-public'

const BROWSER_MANAGED_HEADERS = new Set(['content-length', 'host', 'transfer-encoding'])

export type UploadStatus = 'aborted' | 'completing' | 'created' | 'expired' | 'failed' | 'ready'

export type TerminalUploadStatus = Extract<UploadStatus, 'aborted' | 'expired' | 'failed'>

export interface PresignedUploadContract {
  expiresAt: number
  idempotentReplay: boolean
  presignedUrl: string
  requestHeaders: Record<string, string>
  status: UploadStatus
  uploadId: string
}

export class UploadIntentRetiredError extends Error {
  constructor(
    public readonly status: TerminalUploadStatus | 'aborted' | undefined,
    cause?: unknown,
  ) {
    super(cause instanceof Error ? cause.message : 'upload intent is no longer reusable')
    this.name = 'UploadIntentRetiredError'
  }
}

export function isUploadIntentRetiredError(error: unknown): error is UploadIntentRetiredError {
  return error instanceof UploadIntentRetiredError
}

export function isTerminalUploadStatus(status: UploadStatus): status is TerminalUploadStatus {
  return status === 'aborted' || status === 'expired' || status === 'failed'
}

export function toUploadStatus(status: UploadStatusProto): UploadStatus {
  switch (status) {
    case UploadStatusProto.CREATED:
      return 'created'
    case UploadStatusProto.COMPLETING:
      return 'completing'
    case UploadStatusProto.READY:
      return 'ready'
    case UploadStatusProto.FAILED:
      return 'failed'
    case UploadStatusProto.ABORTED:
      return 'aborted'
    case UploadStatusProto.EXPIRED:
      return 'expired'
    default:
      throw new Error('upload status is invalid')
  }
}

export function resolveGuildIconUrl(guildId: string, iconAssetId: string): string | undefined {
  return resolvePublicAssetUrl('icons', guildId, iconAssetId)
}

export function resolveAvatarUrl(userId: string, avatarAssetId: string): string | undefined {
  return resolvePublicAssetUrl('avatars', userId, avatarAssetId)
}

export async function putToPresignedUrl(
  file: Blob,
  contract: Pick<PresignedUploadContract, 'presignedUrl' | 'requestHeaders'>,
): Promise<void> {
  const headers = new Headers()
  for (const [name, value] of Object.entries(contract.requestHeaders)) {
    if (BROWSER_MANAGED_HEADERS.has(name.toLowerCase())) {
      continue
    }
    headers.set(name, value)
  }

  let response: Response
  try {
    response = await fetch(contract.presignedUrl, {
      body: file,
      headers,
      method: 'PUT',
    })
  } catch {
    throw new Error('Unable to upload the file. Check your connection and try again.')
  }

  if (!response.ok) {
    throw new Error('Unable to upload the file. Please try again.')
  }
}

function resolvePublicAssetUrl(
  kind: 'avatars' | 'icons',
  ownerId: string,
  assetId: string,
): string | undefined {
  if (!assetId || assetId === '0') {
    return undefined
  }

  const baseUrl = normalizeMinioOrigin(import.meta.env.VITE_MINIO_URL)
  if (!baseUrl) {
    return undefined
  }

  return `${baseUrl}/${PUBLIC_BUCKET}/${kind}/${ownerId}/${assetId}`
}

function normalizeMinioOrigin(value: string | undefined) {
  if (!value) {
    return undefined
  }

  const trimmed = value.trim().replace(/\/+$/, '')
  return trimmed || undefined
}
