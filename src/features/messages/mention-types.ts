import type { KeyboardEvent as ReactKeyboardEvent } from 'react'

export type MentionCandidateKind = 'everyone' | 'role' | 'user'

export interface MentionCandidate {
  id: string
  kind: MentionCandidateKind
  label: string
  secondaryLabel?: string
  token: string
}

export interface MentionEditorHandle {
  focus: (options?: FocusOptions) => void
  setSelectionRange: (selectionStart: number, selectionEnd: number) => void
}

export type MentionCandidateSearch = (query: string) => Promise<MentionCandidate[]>

export interface MentionTrigger {
  end: number
  query: string
  start: number
}

export interface MentionInputState {
  activeMentionIndex: number
  handleKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => boolean
  handleSelect: (value: string, selectionStart: number, selectionEnd: number) => void
  insertMention: (candidate: MentionCandidate) => void
  isRemoteSearch: boolean
  isMentionSearchPending: boolean
  mentionCandidates: MentionCandidate[]
  draftMentionCandidates: MentionCandidate[]
  mentionSuggestions: MentionCandidate[]
  showMentionSuggestions: boolean
  reset: () => void
  updateDraft: (value: string, cursor: number | null) => void
}

export interface MentionDraftSegment {
  displayEnd: number
  displayStart: number
  rawEnd: number
  rawStart: number
  text: string
  candidate?: MentionCandidate
}

export interface MentionDraftLayout {
  displayText: string
  segments: MentionDraftSegment[]
}
