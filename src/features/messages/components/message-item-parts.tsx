import { useQuery, useQueryClient } from '@tanstack/react-query'

import { resolveAvatarUrl } from '@/api/assets'
import type { MessageAttachment } from '@/api/message'
import { getInitials } from '@/components/layout/app-shell-types'
import {
  isImageAttachmentContentType,
  isVideoAttachmentContentType,
} from '@/features/messages/attachment-validation'
import { MessageVideoPlayer } from '@/features/messages/components/message-video-player'
import {
  findChannelMessageInCache,
  referencedMessageQueryOptions,
} from '@/features/messages/message-queries'
import { toMessageContentPreview } from '@/features/messages/reply-target'

export function MessageReplyReference({
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
    referenced.author && resolveAvatarUrl(referenced.author.userId, referenced.author.avatarAssetId)
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

export function MessageAttachments({ attachments }: { attachments: MessageAttachment[] }) {
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
