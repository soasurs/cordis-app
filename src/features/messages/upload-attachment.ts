import { putToPresignedUrl } from '@/api/assets'
import {
  abortAttachmentUpload,
  completeAttachmentUpload,
  createAttachmentUpload,
  type MessageAttachment,
} from '@/api/message'

/** Upload one file through create → PUT → complete; abort on failure after create. */
export async function uploadMessageAttachment(
  channelId: string,
  file: File,
): Promise<MessageAttachment> {
  const upload = await createAttachmentUpload(channelId, {
    contentType: file.type.trim().toLowerCase(),
    expectedSize: file.size,
    filename: file.name,
  })

  try {
    await putToPresignedUrl(file, upload)
    return await completeAttachmentUpload(channelId, upload.uploadId)
  } catch (error) {
    try {
      await abortAttachmentUpload(channelId, upload.uploadId)
    } catch {
      // Prefer the original upload failure over a secondary abort error.
    }
    throw error
  }
}
