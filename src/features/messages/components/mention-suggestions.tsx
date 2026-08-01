import type { MentionInputState } from '@/features/messages/mentions'

interface MentionSuggestionsProps {
  input: MentionInputState
  listId: string
  onLoadMore?: () => void
}

export function MentionSuggestions({ input, listId, onLoadMore }: MentionSuggestionsProps) {
  if (!input.showMentionSuggestions) return null

  return (
    <div
      id={listId}
      role="listbox"
      aria-label="Mention suggestions"
      className="border-t border-line bg-surface-raised p-1.5"
    >
      {input.mentionSuggestions.map((candidate, index) => (
        <button
          aria-selected={index === input.activeMentionIndex}
          className={`flex w-full items-center justify-between gap-3 rounded-control px-2.5 py-2 text-left text-sm ${
            index === input.activeMentionIndex ? 'bg-brand-soft text-brand-text' : 'text-ink'
          }`}
          key={`${candidate.kind}:${candidate.id}`}
          role="option"
          type="button"
          onMouseDown={(event) => {
            event.preventDefault()
            input.insertMention(candidate)
          }}
        >
          <span className="min-w-0 truncate font-medium">@{candidate.label}</span>
          {candidate.secondaryLabel ? (
            <span className="shrink-0 truncate text-xs text-muted">{candidate.secondaryLabel}</span>
          ) : null}
        </button>
      ))}
      {input.mentionSuggestions.length === 0 && onLoadMore ? (
        <p className="px-2.5 py-2 text-xs text-muted">No matches on this page.</p>
      ) : null}
      {onLoadMore ? (
        <button
          className="w-full rounded-control px-2.5 py-2 text-left text-xs text-muted hover:bg-surface-hover"
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onLoadMore}
        >
          Load more members…
        </button>
      ) : null}
    </div>
  )
}
