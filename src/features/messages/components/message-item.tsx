import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent, type KeyboardEvent } from 'react'

import { resolveAvatarUrl } from '@/api/assets'
import { getApiErrorMessage } from '@/api/errors'
import { deleteMessage, updateMessage } from '@/api/message'
import { Button } from '@/components/ui/button'
import { getInitials } from '@/components/layout/app-shell-types'
import {
  removeChannelMessageFromApi,
  upsertChannelMessageFromApi,
  type ChannelMessageSummary,
} from '@/features/messages/message-queries'

interface MessageItemProps {
  currentUserId?: string
  message: ChannelMessageSummary
}

export function MessageItem({ currentUserId, message }: MessageItemProps) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.content)
  const [error, setError] = useState<string>()
  const isOwn = Boolean(currentUserId && message.author?.userId === currentUserId)
  const displayName =
    message.author?.name || message.author?.username || `User ${message.author?.userId ?? ''}`
  const username = message.author?.username ?? ''
  const avatarUrl =
    message.author &&
    resolveAvatarUrl(message.author.userId, message.author.avatarAssetId)
  const initials = getInitials(displayName, username)

  const updateMutation = useMutation({
    mutationFn: (content: string) => updateMessage(message.id, { content }),
    onSuccess: (updated) => {
      upsertChannelMessageFromApi(queryClient, updated)
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
      setError(undefined)
    },
    onError: (deleteError) => {
      setError(getApiErrorMessage(deleteError, 'Unable to delete message. Please try again.'))
    },
  })

  const startEdit = () => {
    setDraft(message.content)
    setEditing(true)
    setError(undefined)
  }

  const cancelEdit = () => {
    setEditing(false)
    setDraft(message.content)
    setError(undefined)
  }

  const submitEdit = (event?: FormEvent) => {
    event?.preventDefault()
    const trimmed = draft.trim()
    if (!trimmed || updateMutation.isPending) return
    if (trimmed === message.content) {
      setEditing(false)
      return
    }
    updateMutation.mutate(trimmed)
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

  return (
    <article className="group flex gap-3 px-1 py-1.5 hover:bg-surface-hover/60">
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
          {isOwn && !editing ? (
            <div className="ml-auto flex gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
              <Button size="small" variant="ghost" type="button" onClick={startEdit}>
                Edit
              </Button>
              <Button
                size="small"
                variant="ghost"
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
              >
                Delete
              </Button>
            </div>
          ) : null}
        </div>

        {editing ? (
          <form className="mt-1.5" onSubmit={submitEdit}>
            <textarea
              value={draft}
              rows={3}
              disabled={updateMutation.isPending}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
              className="w-full resize-y rounded-control border border-line bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
            <div className="mt-2 flex gap-2">
              <Button
                size="small"
                type="submit"
                disabled={updateMutation.isPending || !draft.trim()}
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
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-ink">
            {message.content}
          </p>
        )}

        {error ? (
          <p role="alert" className="mt-1 text-xs text-negative">
            {error}
          </p>
        ) : null}
      </div>
    </article>
  )
}

function formatMessageTime(createdAt: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(createdAt))
}
