import type { Attachment as ProtoAttachment } from '@/gen/api/v1/message_pb'

import { assertIdentifier } from '@/api/message/internal'
import { messageClient } from '@/api/message/client'
import type {
  AttachmentUploadContract,
  CreateAttachmentUploadDetails,
  MessageAttachment,
} from '@/api/message/types'

export async function createAttachmentUpload(
  channelId: string,
  details: CreateAttachmentUploadDetails,
): Promise<AttachmentUploadContract> {
  assertIdentifier(channelId, 'channel')
  if (!Number.isInteger(details.expectedSize) || details.expectedSize <= 0) {
    throw new Error('expected upload size is invalid')
  }
  if (!details.contentType.trim()) {
    throw new Error('content type is required')
  }
  if (!details.filename.trim()) {
    throw new Error('filename is required')
  }

  const response = await messageClient.createAttachmentUpload({
    channelId: BigInt(channelId),
    contentType: details.contentType,
    expectedSize: BigInt(details.expectedSize),
    filename: details.filename,
  })

  return {
    expiresAt: Number(response.expiresAt),
    presignedUrl: response.presignedUrl,
    // Copy so callers cannot mutate the Connect response object in place.
    requestHeaders: { ...response.requestHeaders },
    uploadId: response.uploadId.toString(),
  }
}

export async function completeAttachmentUpload(
  channelId: string,
  uploadId: string,
): Promise<MessageAttachment> {
  assertIdentifier(channelId, 'channel')
  assertIdentifier(uploadId, 'upload')

  const response = await messageClient.completeAttachmentUpload({
    channelId: BigInt(channelId),
    uploadId: BigInt(uploadId),
  })

  if (!response.attachment) {
    throw new Error('complete attachment upload response was incomplete')
  }

  return toMessageAttachment(response.attachment)
}

export async function abortAttachmentUpload(channelId: string, uploadId: string): Promise<void> {
  assertIdentifier(channelId, 'channel')
  assertIdentifier(uploadId, 'upload')

  await messageClient.abortAttachmentUpload({
    channelId: BigInt(channelId),
    uploadId: BigInt(uploadId),
  })
}

export function toMessageAttachment(attachment: ProtoAttachment): MessageAttachment {
  return {
    assetId: attachment.assetId.toString(),
    contentType: attachment.contentType,
    filename: attachment.filename,
    height: attachment.height,
    size: Number(attachment.size),
    url: attachment.url,
    urlExpiresAt: Number(attachment.urlExpiresAt),
    width: attachment.width,
  }
}
