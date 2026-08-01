import { isTerminalUploadStatus, putToPresignedUrl, UploadIntentRetiredError } from '@/api/assets'
import {
  abortAttachmentUpload,
  completeAttachmentUpload,
  createAttachmentUpload,
  type MessageAttachment,
} from '@/api/message'

/** Upload one file through create → PUT → complete; abort only before completion starts. */
export async function uploadMessageAttachment(
  channelId: string,
  file: File,
  idempotencyKey: string,
): Promise<MessageAttachment> {
  const upload = await createAttachmentUpload(channelId, {
    contentType: file.type.trim().toLowerCase(),
    expectedSize: file.size,
    filename: file.name,
    idempotencyKey,
  })

  if (isTerminalUploadStatus(upload.status)) {
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
    return await completeAttachmentUpload(channelId, upload.uploadId)
  } catch (error) {
    let abortSucceeded = false
    if (!completionStarted && upload.status === 'created' && upload.presignedUrl) {
      try {
        await abortAttachmentUpload(channelId, upload.uploadId)
        abortSucceeded = true
      } catch {
        // Prefer the original upload failure over a secondary abort error.
      }
    }
    if (abortSucceeded) {
      throw new UploadIntentRetiredError('aborted', error)
    }
    throw error
  }
}
