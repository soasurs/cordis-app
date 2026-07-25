const PUBLIC_BUCKET = 'cordis-public'

const BROWSER_MANAGED_HEADERS = new Set([
  'content-length',
  'host',
  'transfer-encoding',
])

export interface PresignedUploadContract {
  expiresAt: number
  presignedUrl: string
  requestHeaders: Record<string, string>
  uploadId: string
}

export function resolveGuildIconUrl(
  guildId: string,
  iconAssetId: string,
): string | undefined {
  return resolvePublicAssetUrl('icons', guildId, iconAssetId)
}

export function resolveAvatarUrl(
  userId: string,
  avatarAssetId: string,
): string | undefined {
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
