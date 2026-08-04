import * as Dialog from '@radix-ui/react-dialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'

import { resolveAvatarUrl } from '@/api/assets'
import { getApiErrorMessage } from '@/api/errors'
import { createIdempotencyKey } from '@/api/idempotency'
import { deleteMessage, updateMessage, type MessageAttachment } from '@/api/message'
import { Button } from '@/components/ui/button'
import { getInitials } from '@/components/layout/app-shell-types'
import {
  isImageAttachmentContentType,
  isVideoAttachmentContentType,
  MESSAGE_ATTACHMENT_MAX_COUNT,
  messageAttachmentValidationMessage,
  validateMessageAttachmentFile,
} from '@/features/messages/attachment-validation'
import {
  MessageAttachments,
  MessageReplyReference,
} from '@/features/messages/components/message-item-parts'
import { MessageEditForm } from '@/features/messages/components/message-edit-form'
import { formatMessageTime } from '@/features/messages/message-time'
import { useReferencedMessage } from '@/features/messages/message-reference'
import type { PendingAttachmentDraft } from '@/features/messages/components/pending-attachment-chip'
import {
  removeChannelMessageFromApi,
  upsertChannelMessageFromApi,
  type ChannelMessageSummary,
} from '@/features/messages/message-queries'
import { uploadMessageAttachment } from '@/features/messages/upload-attachment'
import {
  containsNewRoleOrEveryoneMention,
  renderMessageContent,
  useMentionInput,
  type MentionCandidate,
  type MentionCandidateSearch,
  type MentionEditorHandle,
} from '@/features/messages/mentions'

interface MessageItemProps {
  /** Guild-level manageMessages (owner / admin / role); channel overwrites come later. */
  canManageMessages?: boolean
  canMentionRolesAndEveryone?: boolean
  currentUserId?: string
  currentUserRoleIds?: string[]
  message: ChannelMessageSummary
  mentionCandidates?: MentionCandidate[]
  onJumpToMessage?: (messageId: string) => void
  onLoadMoreMentionCandidates?: () => void
  onReply?: (message: ChannelMessageSummary) => void
  onSearchMentionCandidates?: MentionCandidateSearch
}

interface ContextMenuPosition {
  x: number
  y: number
}

const CONTEXT_MENU_WIDTH = 168

export function MessageItem({
  canManageMessages = false,
  canMentionRolesAndEveryone = true,
  currentUserId,
  currentUserRoleIds = [],
  message,
  mentionCandidates = [],
  onJumpToMessage,
  onLoadMoreMentionCandidates,
  onReply,
  onSearchMentionCandidates,
}: MessageItemProps) {
  const queryClient = useQueryClient()
  const fileInputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<MentionEditorHandle>(null)
  const pendingRef = useRef<PendingAttachmentDraft[]>([])
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.content)
  const [keptAttachments, setKeptAttachments] = useState<MessageAttachment[]>([])
  const [pending, setPending] = useState<PendingAttachmentDraft[]>([])
  const [error, setError] = useState<string>()
  const [menu, setMenu] = useState<ContextMenuPosition | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const mentionInput = useMentionInput(
    draft,
    setDraft,
    mentionCandidates,
    onLoadMoreMentionCandidates,
    textareaRef,
    onSearchMentionCandidates,
    canMentionRolesAndEveryone,
  )
  const { referenced: referencedMessage } = useReferencedMessage(
    message.referencedChannelId ?? message.channelId,
    message.referencedMessageId ?? '',
  )
  const isOwn = Boolean(currentUserId && message.author?.userId === currentUserId)
  const isMentioned = Boolean(
    currentUserId &&
    (message.mentionEveryone ||
      message.mentionUserIds.includes(currentUserId) ||
      message.mentionRoleIds.some((roleId) => currentUserRoleIds.includes(roleId))),
  )
  const isReplyToCurrentUser = Boolean(
    currentUserId && referencedMessage?.author?.userId === currentUserId,
  )
  const isHighlighted = isMentioned || isReplyToCurrentUser
  const canEdit = isOwn
  const canDelete = isOwn || canManageMessages
  const canReply = Boolean(onReply)
  const hasMessageActions = canEdit || canDelete || canReply
  const displayName =
    message.author?.name || message.author?.username || `User ${message.author?.userId ?? ''}`
  const username = message.author?.username ?? ''
  const avatarUrl =
    message.author && resolveAvatarUrl(message.author.userId, message.author.avatarAssetId)
  const initials = getInitials(displayName, username)

  const updateMutation = useMutation({
    mutationFn: (input: { content?: string; attachmentAssetIds: string[] }) =>
      updateMessage(message.id, {
        attachmentAssetIds: input.attachmentAssetIds,
        ...(input.content !== undefined ? { content: input.content } : {}),
      }),
    onSuccess: (updated) => {
      upsertChannelMessageFromApi(queryClient, updated)
      clearPending()
      setEditing(false)
      setError(undefined)
    },
    onError: (updateError) => {
      setError(getApiErrorMessage(updateError, 'Unable to update message. Please try again.'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteMessage(message.id),
    onSuccess: () => {
      removeChannelMessageFromApi(queryClient, message.channelId, message.id)
      setConfirmDelete(false)
      setError(undefined)
    },
    onError: (deleteError) => {
      setError(getApiErrorMessage(deleteError, 'Unable to delete message. Please try again.'))
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
    if (!menu) return

    const close = () => setMenu(null)
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return
      close()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [menu])

  const clearPending = () => {
    setPending((current) => {
      for (const item of current) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      }
      return []
    })
  }

  const startEdit = () => {
    clearPending()
    setDraft(message.content)
    mentionInput.reset()
    setKeptAttachments(message.attachments)
    setEditing(true)
    setMenu(null)
    setError(undefined)
  }

  const cancelEdit = () => {
    clearPending()
    setEditing(false)
    setDraft(message.content)
    mentionInput.reset()
    setKeptAttachments([])
    setError(undefined)
  }

  const readyAttachments = pending.flatMap((item) =>
    item.status === 'ready' && item.attachment ? [item.attachment] : [],
  )
  const nextAttachmentIds = [
    ...keptAttachments.map((attachment) => attachment.assetId),
    ...readyAttachments.map((attachment) => attachment.assetId),
  ]
  const hasUploading = pending.some((item) => item.status === 'uploading')
  const trimmed = draft.trim()
  const canSave =
    !updateMutation.isPending &&
    !hasUploading &&
    (trimmed.length > 0 || nextAttachmentIds.length > 0)

  const submitEdit = (event?: FormEvent) => {
    event?.preventDefault()
    if (!canSave) return

    const previousIds = message.attachments.map((attachment) => attachment.assetId)
    const contentUnchanged = trimmed === message.content
    const attachmentsUnchanged =
      nextAttachmentIds.length === previousIds.length &&
      nextAttachmentIds.every((id, index) => id === previousIds[index])
    if (contentUnchanged && attachmentsUnchanged) {
      cancelEdit()
      return
    }

    if (!canMentionRolesAndEveryone && containsNewRoleOrEveryoneMention(message.content, trimmed)) {
      setError('You do not have permission to mention roles or everyone in this channel.')
      return
    }

    updateMutation.mutate({
      attachmentAssetIds: nextAttachmentIds,
      ...(contentUnchanged ? {} : { content: trimmed }),
    })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (mentionInput.handleKeyDown(event)) return
    if (event.key === 'Escape') {
      event.preventDefault()
      cancelEdit()
      return
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submitEdit()
    }
  }

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const selected = [...files]
    const usedSlots = keptAttachments.length + pending.length
    const remaining = MESSAGE_ATTACHMENT_MAX_COUNT - usedSlots
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
          contentType,
          filename: file.name,
          idempotencyKey,
          previewUrl,
          status: 'uploading',
        },
      ])
      void uploadMessageAttachment(message.channelId, file, idempotencyKey)
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
                    status: 'error' as const,
                  }
                : item,
            ),
          )
        })
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

  const onContextMenu = (event: MouseEvent<HTMLElement>) => {
    if (!hasMessageActions || editing || confirmDelete) return
    event.preventDefault()
    const maxX = Math.max(8, window.innerWidth - CONTEXT_MENU_WIDTH - 8)
    const maxY = Math.max(8, window.innerHeight - 96)
    setMenu({
      x: Math.min(event.clientX, maxX),
      y: Math.min(event.clientY, maxY),
    })
  }

  const closeDeleteDialog = () => {
    if (!deleteMutation.isPending) setConfirmDelete(false)
  }

  const attachmentSlotsUsed = keptAttachments.length + pending.length

  return (
    <article
      data-message-id={message.id}
      className={
        isHighlighted
          ? 'group rounded-control bg-brand-soft/70 px-1 py-1.5 transition-colors'
          : 'group px-1 py-1.5 hover:bg-surface-hover/60'
      }
      onContextMenu={onContextMenu}
    >
      {message.referencedMessageId ? (
        <MessageReplyReference
          channelId={message.channelId}
          mentionCandidates={mentionCandidates}
          referencedMessageId={message.referencedMessageId}
          onJumpToMessage={onJumpToMessage}
        />
      ) : null}

      <div className="flex gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 grid size-10 shrink-0 place-items-center overflow-hidden rounded-control bg-surface-hover text-xs font-bold text-muted"
        >
          {avatarUrl ? <img src={avatarUrl} alt="" className="size-full object-cover" /> : initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="text-sm font-semibold text-ink">{displayName}</p>
            <time
              className="text-[0.65rem] text-subtle"
              dateTime={new Date(message.createdAt).toISOString()}
            >
              {formatMessageTime(message.createdAt)}
            </time>
            {message.editedAt > 0 ? (
              <span className="text-[0.65rem] text-subtle">(edited)</span>
            ) : null}
          </div>

          {editing ? (
            <MessageEditForm
              attachmentSlotsUsed={attachmentSlotsUsed}
              canSave={canSave}
              draft={draft}
              fileInputId={fileInputId}
              fileInputRef={fileInputRef}
              isSaving={updateMutation.isPending}
              keptAttachments={keptAttachments}
              mentionInput={mentionInput}
              messageId={message.id}
              onAddFiles={addFiles}
              onCancel={cancelEdit}
              onKeyDown={onKeyDown}
              onLoadMoreMentionCandidates={onLoadMoreMentionCandidates}
              onRemoveKeptAttachment={(assetId) =>
                setKeptAttachments((current) =>
                  current.filter((attachment) => attachment.assetId !== assetId),
                )
              }
              onRemovePending={removePending}
              onRawChange={(value, selectionStart) =>
                mentionInput.updateDraft(value, selectionStart)
              }
              onRawSelect={(value, selectionStart, selectionEnd) =>
                mentionInput.handleSelect(value, selectionStart, selectionEnd)
              }
              onSubmit={submitEdit}
              pending={pending}
              textareaRef={textareaRef}
            />
          ) : (
            <>
              {message.content ? (
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-ink">
                  {renderMessageContent(message, mentionInput.mentionCandidates)}
                </p>
              ) : null}
              {message.attachments.length > 0 ? (
                <MessageAttachments attachments={message.attachments} />
              ) : null}
            </>
          )}

          {error ? (
            <p role="alert" className="mt-1 text-xs text-negative">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      {menu ? (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Message actions"
          className="fixed z-40 grid gap-1 rounded-panel border border-line bg-surface-raised p-1.5 shadow-panel"
          style={{ left: menu.x, top: menu.y, width: CONTEXT_MENU_WIDTH }}
        >
          {canReply ? (
            <button
              type="button"
              role="menuitem"
              className="rounded-control px-3 py-2 text-left text-sm font-medium text-ink transition hover:bg-surface-hover focus:bg-surface-hover focus:outline-none"
              onClick={() => {
                setMenu(null)
                onReply?.(message)
              }}
            >
              Reply
            </button>
          ) : null}
          {canEdit ? (
            <button
              type="button"
              role="menuitem"
              className="rounded-control px-3 py-2 text-left text-sm font-medium text-ink transition hover:bg-surface-hover focus:bg-surface-hover focus:outline-none"
              onClick={startEdit}
            >
              Edit
            </button>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              role="menuitem"
              className="rounded-control px-3 py-2 text-left text-sm font-medium text-negative transition hover:bg-surface-hover focus:bg-surface-hover focus:outline-none"
              onClick={() => {
                setMenu(null)
                setConfirmDelete(true)
              }}
            >
              Delete
            </button>
          ) : null}
        </div>
      ) : null}

      <Dialog.Root
        open={confirmDelete}
        onOpenChange={(open) => {
          if (!open) closeDeleteDialog()
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-canvas/75 backdrop-blur-sm" />
          <Dialog.Content
            aria-busy={deleteMutation.isPending || undefined}
            className="fixed top-1/2 left-1/2 z-50 w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-shell border border-line bg-surface p-5 text-ink shadow-panel outline-none sm:p-6"
            onEscapeKeyDown={(event) => {
              if (deleteMutation.isPending) event.preventDefault()
            }}
            onPointerDownOutside={(event) => {
              if (deleteMutation.isPending) event.preventDefault()
            }}
          >
            <Dialog.Title className="text-lg font-semibold tracking-[-0.02em]">
              Delete message
            </Dialog.Title>
            <Dialog.Description className="mt-1.5 text-sm leading-6 text-muted">
              Are you sure you want to delete this message? This cannot be undone.
            </Dialog.Description>
            {message.content ? (
              <p className="mt-4 max-h-24 overflow-hidden whitespace-pre-wrap break-words rounded-control border border-line bg-surface-raised px-3 py-2 text-sm text-muted">
                {message.content}
              </p>
            ) : message.attachments.length > 0 ? (
              <p className="mt-4 text-sm text-muted">
                This message has {message.attachments.length} attachment
                {message.attachments.length === 1 ? '' : 's'}.
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-2">
              <Button
                size="small"
                variant="secondary"
                disabled={deleteMutation.isPending}
                onClick={closeDeleteDialog}
              >
                Cancel
              </Button>
              <Button
                size="small"
                variant="danger"
                loading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
              >
                Delete
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </article>
  )
}
