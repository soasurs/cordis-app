import { forwardRef, useRef, type TextareaHTMLAttributes } from 'react'

import { renderMentionDraftContent, type MentionCandidate } from '@/features/messages/mentions'

interface MentionTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  mentionCandidates: MentionCandidate[]
}

export const MentionTextarea = forwardRef<HTMLTextAreaElement, MentionTextareaProps>(
  function MentionTextarea({ mentionCandidates, onScroll, ...props }, forwardedRef) {
    const overlayRef = useRef<HTMLDivElement>(null)

    return (
      <div className="relative min-w-0 flex-1">
        <div
          ref={overlayRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words py-2 text-sm leading-5 text-ink"
        >
          {renderMentionDraftContent(String(props.value ?? ''), mentionCandidates)}
        </div>
        <textarea
          {...props}
          ref={forwardedRef}
          onScroll={(event) => {
            if (overlayRef.current) overlayRef.current.scrollTop = event.currentTarget.scrollTop
            onScroll?.(event)
          }}
          className={`relative z-10 w-full bg-transparent text-transparent caret-ink selection:text-transparent ${props.className ?? ''}`}
        />
      </div>
    )
  },
)
