import { createElement, type ReactNode } from 'react'

import { isEscaped } from '@/features/messages/mention-parser'
import type {
  MentionCandidate,
  MentionDraftLayout,
  MentionDraftSegment,
} from '@/features/messages/mention-types'

/**
 * Builds the display text and offset map for a draft containing confirmed mentions.
 *
 * The editor stores server-side mention markup, while the user-facing value uses the
 * candidate label. Keeping both offsets lets the editor preserve the raw message without
 * making the long numeric token affect the caret position.
 */
export function createMentionDraftLayout(
  content: string,
  candidates: MentionCandidate[],
): MentionDraftLayout {
  const candidateByKey = new Map(
    candidates.map((candidate) => [`${candidate.kind}:${candidate.id}`, candidate]),
  )
  const segments: MentionDraftSegment[] = []
  const pattern = /<@!?([0-9]+)>|<@&([0-9]+)>|@everyone(?![\p{L}\p{N}_])/gu
  let rawCursor = 0
  let displayCursor = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(content))) {
    const token = match[0]
    const candidate = match[1]
      ? candidateByKey.get(`user:${match[1]}`)
      : match[2]
        ? candidateByKey.get(`role:${match[2]}`)
        : candidateByKey.get('everyone:everyone')
    if (!candidate || isEscaped(content, match.index)) continue

    if (match.index > rawCursor) {
      const text = content.slice(rawCursor, match.index)
      segments.push({
        displayEnd: displayCursor + text.length,
        displayStart: displayCursor,
        rawEnd: match.index,
        rawStart: rawCursor,
        text,
      })
      displayCursor += text.length
    }

    const tokenEnd = match.index + token.length
    const text = `@${candidate.label}`
    segments.push({
      candidate,
      displayEnd: displayCursor + text.length,
      displayStart: displayCursor,
      rawEnd: tokenEnd,
      rawStart: match.index,
      text,
    })
    rawCursor = tokenEnd
    displayCursor += text.length
  }

  if (rawCursor < content.length) {
    const text = content.slice(rawCursor)
    segments.push({
      displayEnd: displayCursor + text.length,
      displayStart: displayCursor,
      rawEnd: content.length,
      rawStart: rawCursor,
      text,
    })
  }

  return {
    displayText: segments.map((segment) => segment.text).join(''),
    segments,
  }
}

export function mentionDisplayOffsetToRawOffset(
  layout: MentionDraftLayout,
  displayOffset: number,
  edge: 'end' | 'start' = 'start',
) {
  const offset = Math.max(0, Math.min(displayOffset, layout.displayText.length))
  for (const segment of layout.segments) {
    if (offset < segment.displayStart) return segment.rawStart
    if (offset > segment.displayEnd) continue
    if (!segment.candidate) return segment.rawStart + (offset - segment.displayStart)
    if (offset === segment.displayStart) return segment.rawStart
    if (offset === segment.displayEnd) return segment.rawEnd
    return edge === 'end' ? segment.rawEnd : segment.rawStart
  }
  return layout.segments.at(-1)?.rawEnd ?? 0
}

export function mentionRawOffsetToDisplayOffset(layout: MentionDraftLayout, rawOffset: number) {
  const offset = Math.max(0, Math.min(rawOffset, layout.segments.at(-1)?.rawEnd ?? 0))
  for (const segment of layout.segments) {
    if (offset < segment.rawStart) return segment.displayStart
    if (offset > segment.rawEnd) continue
    if (!segment.candidate) return segment.displayStart + (offset - segment.rawStart)
    if (offset === segment.rawStart) return segment.displayStart
    if (offset === segment.rawEnd) return segment.displayEnd
    return offset - segment.rawStart < segment.rawEnd - offset
      ? segment.displayStart
      : segment.displayEnd
  }
  return layout.displayText.length
}

export function getMentionDraftDisplayOffset(
  content: string,
  candidates: MentionCandidate[],
  rawOffset: number,
) {
  return mentionRawOffsetToDisplayOffset(createMentionDraftLayout(content, candidates), rawOffset)
}

export function renderMentionDraftContent(
  content: string,
  candidates: MentionCandidate[],
): ReactNode[] {
  return createMentionDraftLayout(content, candidates).segments.map((segment, index) =>
    segment.candidate
      ? createElement(
          'span',
          {
            className: 'rounded-md bg-brand-soft px-1.5 py-0.5 align-middle text-brand-text',
            key: `${segment.rawStart}:${segment.rawEnd}:${index}`,
          },
          segment.text,
        )
      : segment.text,
  )
}
