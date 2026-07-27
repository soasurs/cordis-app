import * as Dialog from '@radix-ui/react-dialog'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
import { MessageVideoPlayer } from '@/features/messages/components/message-video-player'
import {
  ExistingAttachmentChip,
  PendingAttachmentChip,
  type PendingAttachmentDraft,
} from '@/features/messages/components/pending-attachment-chip'
import {
  findChannelMessageInCache,
  referencedMessageQueryOptions,
  removeChannelMessageFromApi,
  upsertChannelMessageFromApi,
  type ChannelMessageSummary,
} from '@/features/messages/message-queries'
import { toMessageContentPreview } from '@/features/messages/reply-target'
import { uploadMessageAttachment } from '@/features/messages/upload-attachment'

interface MessageItemProps {
  /** Guild-level manageMessages (owner / admin / role); channel overwrites come later. */
  canManageMessages?: boolean
  currentUserId?: string
  message: ChannelMessageSummary
  onJumpToMessage?: (messageId: string) => void
  onReply?: (message: ChannelMessageSummary) => void
}

interface ContextMenuPosition {
  x: number
  y: number
}

const CONTEXT_MENU_WIDTH = 168

export function MessageItem({
  canManageMessages = false,
  currentUserId,
  message,
  onJumpToMessage,
  onReply,
}: MessageItemProps) {
  const queryClient = useQueryClient()
  const fileInputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingRef = useRef<PendingAttachmentDraft[]>([])
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.content)
  const [keptAttachments, setKeptAttachments] = useState<MessageAttachment[]>([])
  const [pending, setPending] = useState<PendingAttachmentDraft[]>([])
  const [error, setError] = useState<string>()
  const [menu, setMenu] = useState<ContextMenuPosition | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const isOwn = Boolean(currentUserId && message.author?.userId === currentUserId)
  const canEdit = isOwn
  const canDelete = isOwn || canManageMessages
  const canReply = Boolean(onReply)
  const hasMessageActions = canEdit || canDelete || canReply
  const displayName =
    message.author?.name || message.author?.username || `User ${message.author?.userId ?? ''}`
  const username = message.author?.username ?? ''
  const avatarUrl =
    message.author &&
    resolveAvatarUrl(message.author.userId, message.author.avatarAssetId)
  const initials = getInitials(displayName, username)

  const updateMutation = useMutation({
    mutationFn: (input: { content: string; attachmentAssetIds: string[] }) =>
      updateMessage(message.id, {
        attachmentAssetIds: input.attachmentAssetIds,
        content: input.content,
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
    setKeptAttachments(message.attachments)
    setEditing(true)
    setMenu(null)
    setError(undefined)
  }

  const cancelEdit = () => {
    clearPending()
    setEditing(false)
    setDraft(message.content)
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

    updateMutation.mutate({
      attachmentAssetIds: nextAttachmentIds,
      content: trimmed,
    })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
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
          previewUrl,
          status: 'uploading',
        },
      ])
      void uploadMessageAttachment(message.channelId, file)
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
      className="group px-1 py-1.5 hover:bg-surface-hover/60"
      onContextMenu={onContextMenu}
    >
      {message.referencedMessageId ? (
        <MessageReplyReference
          channelId={message.channelId}
          referencedMessageId={message.referencedMessageId}
          onJumpToMessage={onJumpToMessage}
        />
      ) : null}

      <div className="flex gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 grid size-10 shrink-0 place-items-center overflow-hidden rounded-control bg-surface-hover text-xs font-bold text-muted"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="size-full object-cover" />
          ) : (
            initials
          )}
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
            <form className="mt-1.5" onSubmit={submitEdit}>
              <div className="rounded-control border border-line bg-surface-raised focus-within:border-brand">
                {keptAttachments.length > 0 || pending.length > 0 ? (
                  <ul
                    className="flex flex-wrap gap-2 border-b border-line px-2 pt-2.5 pb-2"
                    aria-label="Message attachments"
                  >
                    {keptAttachments.map((attachment) => (
                      <li key={attachment.assetId}>
                        <ExistingAttachmentChip
                          attachment={attachment}
                          onRemove={() =>
                            setKeptAttachments((current) =>
                              current.filter((item) => item.assetId !== attachment.assetId),
                            )
                          }
                        />
                      </li>
                    ))}
                    {pending.map((item) => (
                      <li key={item.id}>
                        <PendingAttachmentChip
                          item={item}
                          onRemove={() => removePending(item.id)}
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="flex items-start gap-2 px-2 py-1.5">
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
                    className="mt-0.5 h-9 w-9 shrink-0 px-0"
                    aria-label="Attach files"
                    disabled={
                      updateMutation.isPending ||
                      attachmentSlotsUsed >= MESSAGE_ATTACHMENT_MAX_COUNT
                    }
                    onClick={() => fileInputRef.current?.click()}
                  >
                    +
                  </Button>
                  <textarea
                    value={draft}
                    rows={3}
                    disabled={updateMutation.isPending}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={onKeyDown}
                    className="max-h-48 min-h-16 min-w-0 flex-1 resize-y bg-transparent py-2 text-sm leading-5 text-ink outline-none"
                  />
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <Button
                  size="small"
                  type="submit"
                  disabled={!canSave}
                  loading={updateMutation.isPending}
                >
                  Save
                </Button>
                <Button size="small" variant="secondary" type="button" onClick={cancelEdit}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <>
              {message.content ? (
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-ink">
                  {message.content}
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

function MessageReplyReference({
  channelId,
  onJumpToMessage,
  referencedMessageId,
}: {
  channelId: string
  onJumpToMessage?: (messageId: string) => void
  referencedMessageId: string
}) {
  const queryClient = useQueryClient()
  const cached = findChannelMessageInCache(queryClient, channelId, referencedMessageId)
  const referencedQuery = useQuery({
    ...referencedMessageQueryOptions(referencedMessageId),
    enabled: !cached,
  })
  const referenced = cached ?? referencedQuery.data
  const canJump = Boolean(onJumpToMessage && referenced)

  if (referencedQuery.isError && !cached) {
    return (
      <div className="mb-0.5 flex items-end gap-1.5">
        <ReplyConnector />
        <p className="min-w-0 truncate pb-0.5 text-[0.72rem] text-muted">
          Original message was deleted
        </p>
      </div>
    )
  }

  if (!referenced) {
    return (
      <div className="mb-0.5 flex items-end gap-1.5">
        <ReplyConnector />
        <p className="min-w-0 truncate pb-0.5 text-[0.72rem] text-muted" role="status">
          Loading reply…
        </p>
      </div>
    )
  }

  const authorName =
    referenced.author?.name ||
    referenced.author?.username ||
    `User ${referenced.author?.userId ?? ''}`
  const preview = toMessageContentPreview(referenced)
  const avatarUrl =
    referenced.author &&
    resolveAvatarUrl(referenced.author.userId, referenced.author.avatarAssetId)
  const initials = getInitials(authorName, referenced.author?.username ?? '')

  const body = (
    <>
      <span
        aria-hidden="true"
        className="grid size-4 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-hover text-[0.5rem] font-bold text-muted"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="size-full object-cover" />
        ) : (
          initials.slice(0, 2)
        )}
      </span>
      <span className="shrink-0 font-semibold text-ink/80">{authorName}</span>
      <span className="min-w-0 truncate text-muted">{preview}</span>
    </>
  )

  const rowClassName =
    'flex min-w-0 flex-1 items-center gap-1.5 rounded-control px-1.5 py-0.5 text-left text-[0.72rem] leading-4 transition'

  return (
    <div className="mb-0.5 flex items-end gap-1">
      <ReplyConnector />
      {canJump ? (
        <button
          type="button"
          className={`${rowClassName} hover:bg-brand-soft/70`}
          onClick={() => onJumpToMessage?.(referencedMessageId)}
        >
          {body}
        </button>
      ) : (
        <div className={rowClassName}>{body}</div>
      )}
    </div>
  )
}

/** Soft L-rail from the avatar gutter into the reply chip (Discord-inspired, not identical). */
function ReplyConnector() {
  return (
    <span aria-hidden="true" className="relative mb-[7px] ml-[18px] h-2.5 w-[22px] shrink-0">
      <span className="absolute inset-0 rounded-tl-[7px] border-t border-l border-line-strong group-hover:border-brand/45" />
    </span>
  )
}

function MessageAttachments({ attachments }: { attachments: MessageAttachment[] }) {
  return (
    <ul className="mt-2 grid max-w-md justify-items-start gap-2">
      {attachments.map((attachment) => (
        <li key={attachment.assetId}>
          {isImageAttachmentContentType(attachment.contentType) && attachment.url ? (
            <a href={attachment.url} target="_blank" rel="noreferrer" className="inline-block">
              <img
                src={attachment.url}
                alt={attachment.filename}
                className="max-h-80 max-w-full rounded-control border border-line object-contain"
              />
            </a>
          ) : isVideoAttachmentContentType(attachment.contentType) && attachment.url ? (
            <MessageVideoPlayer
              src={attachment.url}
              filename={attachment.filename}
              height={attachment.height}
              width={attachment.width}
            />
          ) : (
            <FileAttachmentCard attachment={attachment} />
          )}
        </li>
      ))}
    </ul>
  )
}

function FileAttachmentCard({ attachment }: { attachment: MessageAttachment }) {
  const extension = fileExtension(attachment.filename)
  const meta = [formatFileSize(attachment.size), extension?.toUpperCase()]
    .filter(Boolean)
    .join(' · ')
  const body = (
    <>
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-control bg-brand-soft text-[0.65rem] font-bold tracking-wide text-brand-text"
      >
        {extension?.slice(0, 4).toUpperCase() || 'FILE'}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{attachment.filename}</span>
        {meta ? <span className="mt-0.5 block text-[0.7rem] text-subtle">{meta}</span> : null}
      </span>
    </>
  )

  if (!attachment.url) {
    return (
      <div className="flex max-w-full items-center gap-3 rounded-control border border-line bg-surface-raised px-3 py-2.5">
        {body}
      </div>
    )
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      className="flex max-w-full items-center gap-3 rounded-control border border-line bg-surface-raised px-3 py-2.5 transition hover:border-line-strong hover:bg-surface-hover"
    >
      {body}
    </a>
  )
}

function fileExtension(filename: string) {
  const match = /\.([a-z0-9]{1,8})$/i.exec(filename.trim())
  return match?.[1]
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return undefined
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`
}

function formatMessageTime(createdAt: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(createdAt))
}
