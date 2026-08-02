import { abortGuildIconUpload, completeGuildIconUpload, createGuildIconUpload } from '@/api/guild'
import {
  isTerminalUploadStatus,
  isUploadIntentRetiredError,
  putToPresignedUrl,
  UploadIntentRetiredError,
} from '@/api/assets'
import { validateGuildIconFile } from '@/features/guilds/validation'

export async function uploadGuildIcon({
  file,
  guildId,
  idempotencyKey,
  onIntentRetired,
}: {
  file: File
  guildId: string
  idempotencyKey: string
  onIntentRetired: () => void
}) {
  const validationError = validateGuildIconFile(file)
  if (validationError) throw new Error(validationError)

  const upload = await createGuildIconUpload(guildId, {
    contentType: file.type,
    expectedSize: file.size,
    idempotencyKey,
  })

  if (isTerminalUploadStatus(upload.status)) {
    onIntentRetired()
    throw new UploadIntentRetiredError(upload.status)
  }

  let completionStarted = false
  try {
    if (upload.status === 'created') {
      if (!upload.presignedUrl) {
        throw new Error('upload response is missing a presigned URL')
      }
      await putToPresignedUrl(file, upload)
    }
    completionStarted = true
    return await completeGuildIconUpload(guildId, upload.uploadId)
  } catch (error) {
    if (isUploadIntentRetiredError(error)) {
      onIntentRetired()
      throw error
    }

    let abortSucceeded = false
    if (!completionStarted && upload.status === 'created' && upload.presignedUrl) {
      try {
        await abortGuildIconUpload(guildId, upload.uploadId)
        abortSucceeded = true
      } catch {
        // Best-effort cleanup; surface the original upload failure below.
      }
    }
    if (abortSucceeded) {
      onIntentRetired()
      throw new UploadIntentRetiredError('aborted', error)
    }
    throw error
  }
}
