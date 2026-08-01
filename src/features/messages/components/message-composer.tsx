import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'

import { isUploadIntentRetiredError } from '@/api/assets'
import { getApiErrorMessage } from '@/api/errors'
import {
  createIdempotencyKey,
  getIdempotencyKeyForIntent,
  type IdempotencyIntent,
} from '@/api/idempotency'
import { createMessage } from '@/api/message'
import { Button } from '@/components/ui/button'
import {
  isImageAttachmentContentType,
  isVideoAttachmentContentType,
  MESSAGE_ATTACHMENT_MAX_COUNT,
  messageAttachmentValidationMessage,
  validateMessageAttachmentFile,
} from '@/features/messages/attachment-validation'
import {
  PendingAttachmentChip,
  type PendingAttachmentDraft,
} from '@/features/messages/components/pending-attachment-chip'
import { MentionSuggestions } from '@/features/messages/components/mention-suggestions'
import { MentionTextarea } from '@/features/messages/components/mention-textarea'
import { upsertChannelMessageFromApi } from '@/features/messages/message-queries'
import { markChannelReadThrough } from '@/features/messages/read-state-queries'
import type { MessageReplyTarget } from '@/features/messages/reply-target'
import { uploadMessageAttachment } from '@/features/messages/upload-attachment'
import {
  containsRoleOrEveryoneMention,
  useMentionInput,
  type MentionCandidate,
  type MentionCandidateSearch,
  type MentionEditorHandle,
} from '@/features/messages/mentions'

interface MessageComposerProps {
  canSend: boolean
  canMentionRolesAndEveryone?: boolean
  channelId: string
  channelName: string
  mentionCandidates?: MentionCandidate[]
  onClearReply?: () => void
  onLoadMoreMentionCandidates?: () => void
  onSearchMentionCandidates?: MentionCandidateSearch
  replyTo?: MessageReplyTarget
}

export function MessageComposer({
  canSend,
  canMentionRolesAndEveryone = true,
  channelId,
  channelName,
  mentionCandidates = [],
  onLoadMoreMentionCandidates,
  onSearchMentionCandidates,
  onClearReply,
  replyTo,
}: MessageComposerProps) {
  const queryClient = useQueryClient()
  const fileInputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sendIntentRef = useRef<IdempotencyIntent | undefined>(undefined)
  const textareaRef = useRef<MentionEditorHandle>(null)
  const pendingRef = useRef<PendingAttachmentDraft[]>([])
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState<PendingAttachmentDraft[]>([])
  const [error, setError] = useState<string>()
  const mentionInput = useMentionInput(
    draft,
    setDraft,
    mentionCandidates,
    onLoadMoreMentionCandidates,
    textareaRef,
    onSearchMentionCandidates,
    canMentionRolesAndEveryone,
  )

  const focusComposer = () => {
    textareaRef.current?.focus()
  }

  const clearPending = () => {
    setPending((current) => {
      for (const item of current) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      }
      return []
    })
  }

  const sendMutation = useMutation({
    mutationFn: (input: {
      attachmentAssetIds: string[]
      content: string
      idempotencyKey: string
      referencedChannelId?: string
      referencedMessageId?: string
    }) =>
      createMessage({
        attachmentAssetIds: input.attachmentAssetIds,
        channelId,
        content: input.content,
        idempotencyKey: input.idempotencyKey,
        referencedChannelId: input.referencedChannelId,
        referencedMessageId: input.referencedMessageId,
      }),
    onSuccess: (message) => {
      upsertChannelMessageFromApi(queryClient, message)
      markChannelReadThrough(queryClient, channelId, message.id)
      setError(undefined)
      sendIntentRef.current = undefined
      clearPending()
      onClearReply?.()
      queueMicrotask(focusComposer)
    },
    onError: (sendError) => {
      setError(getApiErrorMessage(sendError, 'Unable to send message. Please try again.'))
      queueMicrotask(focusComposer)
    },
  })

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

  useEffect(() => {
    if (!replyTo) return
    focusComposer()
  }, [replyTo])

  const trimmed = draft.trim()
  const readyAttachments = pending.flatMap((item) =>
    item.status === 'ready' && item.attachment ? [item.attachment] : [],
  )
  const hasUploading = pending.some((item) => item.status === 'uploading')
  const canSubmit =
    canSend &&
    !sendMutation.isPending &&
    !hasUploading &&
    (trimmed.length > 0 || readyAttachments.length > 0)
  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    if (!canSubmit) return
    const content = trimmed
    if (!canMentionRolesAndEveryone && containsRoleOrEveryoneMention(content)) {
      setError('You do not have permission to mention roles or everyone in this channel.')
      queueMicrotask(focusComposer)
      return
    }
    const attachmentAssetIds = readyAttachments.map((attachment) => attachment.assetId)
    const referencedChannelId = replyTo?.channelId
    const referencedMessageId = replyTo?.id
    const intent = getIdempotencyKeyForIntent(
      sendIntentRef.current,
      JSON.stringify({
        attachmentAssetIds,
        channelId,
        content,
        referencedChannelId,
        referencedMessageId,
      }),
    )
    sendIntentRef.current = intent
    // Clear the text immediately so the next message can be typed while this send is in flight.
    setDraft('')
    mentionInput.reset()
    setError(undefined)
    sendMutation.mutate(
      {
        attachmentAssetIds,
        content,
        idempotencyKey: intent.key,
        referencedChannelId,
        referencedMessageId,
      },
      {
        onError: () => {
          setDraft(content)
        },
      },
    )
    // Clicking Send moves focus to the button; keep the composer ready for the next message.
    focusComposer()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (mentionInput.handleKeyDown(event)) return
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
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
      setError(messageAttachmentValidationMessage.count)
      return
    }

    const accepted = selected.slice(0, remaining)
    if (selected.length > remaining) {
      setError(messageAttachmentValidationMessage.count)
    } else {
      setError(undefined)
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

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removePending = (id: string) => {
    setPending((current) => {
      const target = current.find((item) => item.id === id)
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

  if (!canSend) {
    return (
      <div className="border-t border-line px-4 pt-2 pb-3 sm:px-5 sm:pt-2.5 sm:pb-4">
        <p className="rounded-control border border-line bg-surface-raised px-3 py-2.5 text-sm text-muted">
          You do not have permission to send messages in #{channelName}.
        </p>
      </div>
    )
  }

  return (
    <form
      className="border-t border-line px-3 pt-2 pb-3 sm:px-4 sm:pt-2.5 sm:pb-4"
      onSubmit={submit}
    >
      <div className="relative rounded-control border border-line bg-surface-raised focus-within:border-brand">
        {replyTo ? (
          <div className="flex items-center gap-2 border-b border-line px-3 py-2">
            <span
              aria-hidden="true"
              className="mb-px h-3 w-3 shrink-0 rounded-tl-md border-t border-l border-brand/50"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.72rem] leading-4">
                <span className="font-semibold text-brand-text">
                  Replying to {replyTo.authorName}
                </span>
                <span className="text-muted"> · {replyTo.contentPreview}</span>
              </p>
            </div>
            <Button
              size="small"
              variant="ghost"
              type="button"
              className="h-7 shrink-0 px-2 text-xs"
              aria-label="Cancel reply"
              onClick={() => onClearReply?.()}
            >
              ×
            </Button>
          </div>
        ) : null}

        {pending.length > 0 ? (
          <ul
            className="flex flex-wrap gap-2 border-b border-line px-2 pt-2.5 pb-2"
            aria-label="Pending attachments"
          >
            {pending.map((item) => (
              <li key={item.id}>
                <PendingAttachmentChip
                  item={item}
                  onRemove={() => removePending(item.id)}
                  onRetry={item.file ? () => retryPending(item.id) : undefined}
                />
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex items-center gap-2 px-2 py-1.5">
          <input
            ref={fileInputRef}
            id={fileInputId}
            type="file"
            multiple
            className="sr-only"
            onChange={(event) => addFiles(event.target.files)}
          />
          <Button
            size="small"
            variant="ghost"
            type="button"
            className="h-9 w-9 shrink-0 px-0"
            aria-label="Attach files"
            disabled={sendMutation.isPending || pending.length >= MESSAGE_ATTACHMENT_MAX_COUNT}
            onClick={() => fileInputRef.current?.click()}
          >
            +
          </Button>
          <label className="sr-only" htmlFor={`message-composer-${channelId}`}>
            Message #{channelName}
          </label>
          <MentionTextarea
            ref={textareaRef}
            mentionCandidates={mentionInput.draftMentionCandidates}
            id={`message-composer-${channelId}`}
            value={draft}
            placeholder={replyTo ? `Reply to ${replyTo.authorName}` : `Message #${channelName}`}
            aria-label={`Message #${channelName}`}
            onRawChange={(value, selectionStart) => mentionInput.updateDraft(value, selectionStart)}
            onKeyDown={onKeyDown}
            onRawSelect={(value, selectionStart, selectionEnd) =>
              mentionInput.handleSelect(value, selectionStart, selectionEnd)
            }
            aria-autocomplete="list"
            aria-controls={
              mentionInput.showMentionSuggestions ? `mention-suggestions-${channelId}` : undefined
            }
            aria-expanded={mentionInput.showMentionSuggestions}
            className="h-9 max-h-40 min-h-9 min-w-0 flex-1 resize-none bg-transparent py-2 text-sm leading-5 text-ink outline-none placeholder:text-subtle"
          />
          <Button
            size="small"
            type="submit"
            className="h-9 shrink-0"
            disabled={!canSubmit}
            loading={sendMutation.isPending}
          >
            Send
          </Button>
        </div>
        <MentionSuggestions
          input={mentionInput}
          listId={`mention-suggestions-${channelId}`}
          onLoadMore={onLoadMoreMentionCandidates}
        />
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-negative">
          {error}
        </p>
      ) : null}
    </form>
  )
}
