import { useEffect, useRef, useState } from 'react'

import { isUploadIntentRetiredError } from '@/api/assets'
import { getApiErrorMessage } from '@/api/errors'
import { createIdempotencyKey } from '@/api/idempotency'
import {
  isImageAttachmentContentType,
  isVideoAttachmentContentType,
} from '@/features/messages/attachment-validation'
import {
  MESSAGE_ATTACHMENT_MAX_COUNT,
  messageAttachmentValidationMessage,
  validateMessageAttachmentFile,
} from '@/features/messages/attachment-validation'
import type { PendingAttachmentDraft } from '@/features/messages/components/pending-attachment-chip'
import { uploadMessageAttachment } from '@/features/messages/upload-attachment'

export function useMessageAttachments(channelId: string) {
  const pendingRef = useRef<PendingAttachmentDraft[]>([])
  const [pending, setPending] = useState<PendingAttachmentDraft[]>([])
  const [selectionError, setSelectionError] = useState<string>()

  useEffect(() => {
    pendingRef.current = pending
  }, [pending])

  useEffect(() => {
    return () => {
      for (const item of pendingRef.current) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      }
    }
  }, [])

  const clearPending = () => {
    setPending((current) => {
      for (const item of current) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      }
      return []
    })
  }

  const startAttachmentUpload = (id: string, file: File, idempotencyKey: string) => {
    setPending((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              channelId,
              errorMessage: undefined,
              idempotencyKey,
              status: 'uploading' as const,
            }
          : item,
      ),
    )

    void uploadMessageAttachment(channelId, file, idempotencyKey)
      .then((attachment) => {
        setPending((current) =>
          current.map((item) =>
            item.id === id ? { ...item, attachment, status: 'ready' as const } : item,
          ),
        )
      })
      .catch((uploadError) => {
        setPending((current) =>
          current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  errorMessage: getApiErrorMessage(
                    uploadError,
                    'Unable to upload this file. Please try again.',
                  ),
                  idempotencyKey: isUploadIntentRetiredError(uploadError)
                    ? undefined
                    : idempotencyKey,
                  status: 'error' as const,
                }
              : item,
          ),
        )
      })
  }

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const selected = [...files]
    const remaining = MESSAGE_ATTACHMENT_MAX_COUNT - pending.length
    if (remaining <= 0) {
      setSelectionError(messageAttachmentValidationMessage.count)
      return
    }

    const accepted = selected.slice(0, remaining)
    if (selected.length > remaining) {
      setSelectionError(messageAttachmentValidationMessage.count)
    } else {
      setSelectionError(undefined)
    }

    for (const file of accepted) {
      const validationError = validateMessageAttachmentFile(file)
      const id = crypto.randomUUID()
      const idempotencyKey = createIdempotencyKey()
      const contentType = file.type.trim().toLowerCase()
      const previewUrl =
        isImageAttachmentContentType(contentType) || isVideoAttachmentContentType(contentType)
          ? URL.createObjectURL(file)
          : undefined

      if (validationError) {
        setPending((current) => [
          ...current,
          {
            id,
            contentType,
            errorMessage: validationError,
            filename: file.name,
            previewUrl,
            status: 'error',
          },
        ])
        continue
      }

      setPending((current) => [
        ...current,
        {
          id,
          channelId,
          contentType,
          file,
          filename: file.name,
          idempotencyKey,
          previewUrl,
          status: 'uploading',
        },
      ])
      startAttachmentUpload(id, file, idempotencyKey)
    }
  }

  const removePending = (id: string) => {
    setPending((current) => {
      const target = current.find((candidate) => candidate.id === id)
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
      return current.filter((item) => item.id !== id)
    })
  }

  const retryPending = (id: string) => {
    const item = pending.find((candidate) => candidate.id === id)
    if (!item?.file) return

    const idempotencyKey =
      item.channelId === channelId && item.idempotencyKey
        ? item.idempotencyKey
        : createIdempotencyKey()
    startAttachmentUpload(id, item.file, idempotencyKey)
  }

  return {
    addFiles,
    clearError: () => setSelectionError(undefined),
    clearPending,
    hasUploading: pending.some((item) => item.status === 'uploading'),
    pending,
    readyAttachments: pending.flatMap((item) =>
      item.status === 'ready' && item.attachment ? [item.attachment] : [],
    ),
    removePending,
    retryPending,
    selectionError,
  }
}
