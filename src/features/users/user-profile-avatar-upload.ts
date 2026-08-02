import { abortAvatarUpload, createAvatarUpload, type AvatarUploadConstraints } from '@/api/user'
import {
  isTerminalUploadStatus,
  isUploadIntentRetiredError,
  putToPresignedUrl,
  UploadIntentRetiredError,
} from '@/api/assets'
import { getApiErrorMessage } from '@/api/errors'

export async function uploadUserAvatar({
  file,
  constraints,
  idempotencyKey,
  onIntentRetired,
}: {
  constraints?: AvatarUploadConstraints
  file: File
  idempotencyKey?: string
  onIntentRetired: () => void
}) {
  const validationError = validateAvatarFile(file, constraints)
  if (validationError) throw new Error(validationError)

  const upload = await createAvatarUpload(file, { idempotencyKey })
  const uploadId = upload.uploadId
  const shouldAbortUpload = upload.status === 'created' && Boolean(upload.presignedUrl)
  let completionStarted = false

  try {
    if (isTerminalUploadStatus(upload.status)) {
      throw new UploadIntentRetiredError(upload.status)
    }
    if (upload.status === 'created') {
      if (!upload.presignedUrl) {
        throw new Error('upload response is missing a presigned URL')
      }
      await putToPresignedUrl(file, upload)
    }
    completionStarted = true
    return uploadId
  } catch (error) {
    if (isUploadIntentRetiredError(error)) {
      onIntentRetired()
      throw error
    }
    if (shouldAbortUpload && !completionStarted) {
      let abortSucceeded = false
      try {
        await abortAvatarUpload(uploadId)
        abortSucceeded = true
      } catch {
        // Best-effort cleanup; surface the original update or upload failure.
      }
      if (abortSucceeded) {
        onIntentRetired()
        throw new UploadIntentRetiredError('aborted', error)
      }
    }
    throw error
  }
}

export function validateAvatarFile(
  file: Pick<File, 'size' | 'type'>,
  constraints?: AvatarUploadConstraints,
) {
  if (!constraints) return 'Avatar upload limits are still loading. Please try again.'
  if (!constraints.allowedContentTypes.includes(file.type)) {
    return 'Choose a supported JPEG, PNG, or WebP image.'
  }
  if (file.size <= 0 || file.size > constraints.maxFileSizeBytes) {
    const maximumMB = Math.max(1, Math.floor(constraints.maxFileSizeBytes / 1_000_000))
    return `Choose an image up to ${maximumMB} MB.`
  }
  return undefined
}

export function getAvatarMutationError(error: unknown) {
  if (
    error instanceof Error &&
    (error.message.startsWith('Choose an image') || error.message.startsWith('Choose a supported'))
  ) {
    return error.message
  }
  return getApiErrorMessage(error, 'Unable to update your profile. Please try again.')
}
