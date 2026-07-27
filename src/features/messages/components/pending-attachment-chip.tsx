import type { MessageAttachment } from '@/api/message'
import {
  isImageAttachmentContentType,
  isVideoAttachmentContentType,
} from '@/features/messages/attachment-validation'
import { VideoFramePreview } from '@/features/messages/components/message-video-player'

export interface PendingAttachmentDraft {
  attachment?: MessageAttachment
  contentType: string
  errorMessage?: string
  filename: string
  id: string
  /** Local or remote URL for image/video thumbnails; revoke object URLs on remove/unmount. */
  previewUrl?: string
  status: 'uploading' | 'ready' | 'error'
}

export function PendingAttachmentChip({
  item,
  onRemove,
}: {
  item: PendingAttachmentDraft
  onRemove: () => void
}) {
  const isImage = isImageAttachmentContentType(item.contentType) && Boolean(item.previewUrl)
  const isVideo = isVideoAttachmentContentType(item.contentType) && Boolean(item.previewUrl)
  const hasMediaPreview = isImage || isVideo
  const statusLabel =
    item.status === 'uploading' ? 'Uploading' : item.status === 'error' ? 'Failed' : undefined

  return (
    <div
      className={`relative overflow-hidden rounded-control border bg-surface-raised ${
        item.status === 'error' ? 'border-negative/40' : 'border-line'
      } ${hasMediaPreview ? 'w-24' : 'max-w-[12rem]'}`}
    >
      {isImage ? (
        <div className="relative aspect-square bg-surface-hover">
          <img src={item.previewUrl} alt={item.filename} className="size-full object-cover" />
          {item.status === 'uploading' ? (
            <div className="absolute inset-0 grid place-items-center bg-canvas/55 text-[0.65rem] font-medium text-ink">
              Uploading…
            </div>
          ) : null}
        </div>
      ) : isVideo ? (
        <div className="relative aspect-square bg-surface-hover">
          <VideoFramePreview
            src={item.previewUrl!}
            filename={item.filename}
            className="size-full object-cover"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 grid place-items-center"
          >
            <span className="grid size-7 place-items-center rounded-full bg-canvas/80 text-[0.65rem] font-bold text-ink">
              ▶
            </span>
          </span>
          {item.status === 'uploading' ? (
            <div className="absolute inset-0 grid place-items-center bg-canvas/55 text-[0.65rem] font-medium text-ink">
              Uploading…
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-14 flex-col justify-center gap-1 px-3 py-2">
          <p className="truncate text-xs font-medium text-ink" title={item.filename}>
            {item.filename}
          </p>
          {statusLabel ? (
            <p
              className={`text-[0.65rem] ${item.status === 'error' ? 'text-negative' : 'text-subtle'}`}
            >
              {statusLabel}
              {item.status === 'uploading' ? '…' : ''}
            </p>
          ) : null}
        </div>
      )}

      {item.status === 'error' && item.errorMessage ? (
        <p className="border-t border-negative/20 px-2 py-1 text-[0.65rem] leading-4 text-negative">
          {item.errorMessage}
        </p>
      ) : null}

      <button
        type="button"
        aria-label={`Remove ${item.filename}`}
        onClick={onRemove}
        className="absolute top-1 right-1 grid size-6 place-items-center rounded-full border border-line bg-canvas/90 text-muted shadow-sm hover:bg-surface-hover hover:text-ink"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          className="size-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        >
          <path d="M3 3l6 6M9 3L3 9" />
        </svg>
      </button>
    </div>
  )
}

/** Chip for an existing message attachment while editing (keep or remove). */
export function ExistingAttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: MessageAttachment
  onRemove: () => void
}) {
  const previewUrl =
    isImageAttachmentContentType(attachment.contentType) ||
    isVideoAttachmentContentType(attachment.contentType)
      ? attachment.url || undefined
      : undefined

  return (
    <PendingAttachmentChip
      item={{
        attachment,
        contentType: attachment.contentType,
        filename: attachment.filename,
        id: attachment.assetId,
        previewUrl,
        status: 'ready',
      }}
      onRemove={onRemove}
    />
  )
}
