import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'

import { getApiErrorMessage } from '@/api/errors'
import { getIdempotencyKeyForIntent, type IdempotencyIntent } from '@/api/idempotency'
import { createMessage } from '@/api/message'
import { Button } from '@/components/ui/button'
import { MESSAGE_ATTACHMENT_MAX_COUNT } from '@/features/messages/attachment-validation'
import { MessageContentPreview } from '@/features/messages/components/message-content-preview'
import { MentionSuggestions } from '@/features/messages/components/mention-suggestions'
import { MentionTextarea } from '@/features/messages/components/mention-textarea'
import { PendingAttachmentChip } from '@/features/messages/components/pending-attachment-chip'
import {
  containsRoleOrEveryoneMention,
  useMentionInput,
  type MentionCandidate,
  type MentionCandidateSearch,
  type MentionEditorHandle,
} from '@/features/messages/mentions'
import { upsertChannelMessageFromApi } from '@/features/messages/message-queries'
import { markChannelReadThrough } from '@/features/messages/read-state-queries'
import type { MessageReplyTarget } from '@/features/messages/reply-target'
import { useMessageAttachments } from '@/features/messages/use-message-attachments'

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
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string>()
  const attachments = useMessageAttachments(channelId)
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
      attachments.clearError()
      sendIntentRef.current = undefined
      attachments.clearPending()
      onClearReply?.()
      queueMicrotask(focusComposer)
    },
    onError: (sendError) => {
      setError(getApiErrorMessage(sendError, 'Unable to send message. Please try again.'))
      queueMicrotask(focusComposer)
    },
  })

  useEffect(() => {
    if (!replyTo) return
    focusComposer()
  }, [replyTo])

  const trimmed = draft.trim()
  const attachmentAssetIds = attachments.readyAttachments.map((attachment) => attachment.assetId)
  const canSubmit =
    canSend &&
    !sendMutation.isPending &&
    !attachments.hasUploading &&
    (trimmed.length > 0 || attachmentAssetIds.length > 0)
  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    if (!canSubmit) return
    const content = trimmed
    if (!canMentionRolesAndEveryone && containsRoleOrEveryoneMention(content)) {
      setError('You do not have permission to mention roles or everyone in this channel.')
      queueMicrotask(focusComposer)
      return
    }
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
    attachments.clearError()
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

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    setError(undefined)
    attachments.addFiles(files)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const displayError = error ?? attachments.selectionError

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
                <span className="text-muted"> · </span>
                <MessageContentPreview
                  content={replyTo.content}
                  contentPreview={replyTo.contentPreview}
                  mentionEveryone={replyTo.mentionEveryone}
                  mentionCandidates={mentionCandidates}
                  mentionRoleIds={replyTo.mentionRoleIds}
                  mentionUserIds={replyTo.mentionUserIds}
                />
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

        {attachments.pending.length > 0 ? (
          <ul
            className="flex flex-wrap gap-2 border-b border-line px-2 pt-2.5 pb-2"
            aria-label="Pending attachments"
          >
            {attachments.pending.map((item) => (
              <li key={item.id}>
                <PendingAttachmentChip
                  item={item}
                  onRemove={() => attachments.removePending(item.id)}
                  onRetry={item.file ? () => attachments.retryPending(item.id) : undefined}
                />
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex items-end gap-2 px-2 py-1.5">
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
            disabled={
              sendMutation.isPending || attachments.pending.length >= MESSAGE_ATTACHMENT_MAX_COUNT
            }
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
            className="max-h-40 min-h-9 min-w-0 flex-1 resize-none bg-transparent py-2 text-sm leading-5 text-ink outline-none placeholder:text-subtle"
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
      {displayError ? (
        <p role="alert" className="mt-2 text-xs text-negative">
          {displayError}
        </p>
      ) : null}
    </form>
  )
}
