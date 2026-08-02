import type { MessageAttachment } from '@/api/message'
import { Button } from '@/components/ui/button'
import {
  ExistingAttachmentChip,
  PendingAttachmentChip,
  type PendingAttachmentDraft,
} from '@/features/messages/components/pending-attachment-chip'
import { MentionSuggestions } from '@/features/messages/components/mention-suggestions'
import { MentionTextarea } from '@/features/messages/components/mention-textarea'
import { MESSAGE_ATTACHMENT_MAX_COUNT } from '@/features/messages/attachment-validation'
import type { MentionEditorHandle, MentionInputState } from '@/features/messages/mentions'
import type { FormEvent, KeyboardEvent, RefObject } from 'react'

interface MessageEditFormProps {
  attachmentSlotsUsed: number
  canSave: boolean
  draft: string
  fileInputId: string
  fileInputRef: RefObject<HTMLInputElement | null>
  isSaving: boolean
  keptAttachments: MessageAttachment[]
  mentionInput: MentionInputState
  messageId: string
  onAddFiles: (files: FileList | null) => void
  onCancel: () => void
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
  onLoadMoreMentionCandidates?: () => void
  onRemoveKeptAttachment: (assetId: string) => void
  onRemovePending: (id: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  pending: PendingAttachmentDraft[]
  onRawChange: (value: string, selectionStart: number) => void
  onRawSelect: (value: string, selectionStart: number, selectionEnd: number) => void
  textareaRef: RefObject<MentionEditorHandle | null>
}

export function MessageEditForm({
  attachmentSlotsUsed,
  canSave,
  draft,
  fileInputId,
  fileInputRef,
  isSaving,
  keptAttachments,
  mentionInput,
  messageId,
  onAddFiles,
  onCancel,
  onKeyDown,
  onLoadMoreMentionCandidates,
  onRemoveKeptAttachment,
  onRemovePending,
  onSubmit,
  pending,
  onRawChange,
  onRawSelect,
  textareaRef,
}: MessageEditFormProps) {
  return (
    <form className="mt-1.5" onSubmit={onSubmit}>
      <div className="relative rounded-control border border-line bg-surface-raised focus-within:border-brand">
        {keptAttachments.length > 0 || pending.length > 0 ? (
          <ul
            className="flex flex-wrap gap-2 border-b border-line px-2 pt-2.5 pb-2"
            aria-label="Message attachments"
          >
            {keptAttachments.map((attachment) => (
              <li key={attachment.assetId}>
                <ExistingAttachmentChip
                  attachment={attachment}
                  onRemove={() => onRemoveKeptAttachment(attachment.assetId)}
                />
              </li>
            ))}
            {pending.map((item) => (
              <li key={item.id}>
                <PendingAttachmentChip item={item} onRemove={() => onRemovePending(item.id)} />
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
            onChange={(event) => onAddFiles(event.target.files)}
          />
          <Button
            size="small"
            variant="ghost"
            type="button"
            className="mt-0.5 h-9 w-9 shrink-0 px-0"
            aria-label="Attach files"
            disabled={isSaving || attachmentSlotsUsed >= MESSAGE_ATTACHMENT_MAX_COUNT}
            onClick={() => fileInputRef.current?.click()}
          >
            +
          </Button>
          <MentionTextarea
            ref={textareaRef}
            mentionCandidates={mentionInput.draftMentionCandidates}
            value={draft}
            disabled={isSaving}
            aria-label="Edit message"
            onRawChange={onRawChange}
            onKeyDown={onKeyDown}
            onRawSelect={onRawSelect}
            aria-autocomplete="list"
            aria-controls={
              mentionInput.showMentionSuggestions ? `mention-suggestions-${messageId}` : undefined
            }
            aria-expanded={mentionInput.showMentionSuggestions}
            className="max-h-48 min-h-16 min-w-0 flex-1 resize-y bg-transparent py-2 text-sm leading-5 text-ink outline-none"
          />
        </div>
        <MentionSuggestions
          input={mentionInput}
          listId={`mention-suggestions-${messageId}`}
          onLoadMore={onLoadMoreMentionCandidates}
        />
      </div>
      <div className="mt-2 flex gap-2">
        <Button size="small" type="submit" disabled={!canSave} loading={isSaving}>
          Save
        </Button>
        <Button size="small" variant="secondary" type="button" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
