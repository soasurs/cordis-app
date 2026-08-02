import {
  useEffect,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from 'react'

import {
  filterMentionCandidates,
  filterMentionCandidatesByPermission,
  isRoleOrEveryoneMentionCandidate,
  replaceMentionTrigger,
} from '@/features/messages/mention-candidates'
import { getMentionDraftDisplayOffset } from '@/features/messages/mention-draft'
import { findMentionTrigger } from '@/features/messages/mention-parser'
import type {
  MentionCandidate,
  MentionCandidateSearch,
  MentionEditorHandle,
  MentionInputState,
  MentionTrigger,
} from '@/features/messages/mention-types'

const MENTION_SEARCH_DEBOUNCE_MS = 200

export function useMentionInput(
  value: string,
  onChange: (value: string) => void,
  candidates: MentionCandidate[],
  onLoadMore?: () => void,
  editorRef?: RefObject<MentionEditorHandle | null>,
  onSearch?: MentionCandidateSearch,
  canMentionRolesAndEveryone = true,
): MentionInputState {
  const [mentionTrigger, setMentionTrigger] = useState<MentionTrigger>()
  const [activeMentionIndex, setActiveMentionIndex] = useState(0)
  const [resolvedSearchQuery, setResolvedSearchQuery] = useState<string>()
  const [searchResults, setSearchResults] = useState<MentionCandidate[]>([])
  const hasRemoteSearch = Boolean(onSearch)
  const mentionQuery = mentionTrigger?.query
  const hasMentionQuery = Boolean(mentionQuery?.trim())
  const isMentionSearchPending = Boolean(
    onSearch && hasMentionQuery && resolvedSearchQuery !== mentionQuery,
  )

  useEffect(() => {
    if (!onSearch || mentionQuery === undefined || !mentionQuery.trim()) return

    const query = mentionQuery
    let active = true
    const timeoutId = window.setTimeout(() => {
      void onSearch(query)
        .then((nextResults) => {
          if (!active) return
          setSearchResults(nextResults)
          setResolvedSearchQuery(query)
        })
        .catch(() => {
          if (!active) return
          setSearchResults([])
          setResolvedSearchQuery(query)
        })
    }, MENTION_SEARCH_DEBOUNCE_MS)

    return () => {
      active = false
      window.clearTimeout(timeoutId)
    }
  }, [mentionQuery, onSearch])

  const mentionCandidates = mergeMentionCandidates(candidates, searchResults)
  const draftMentionCandidates = filterMentionCandidatesByPermission(
    mentionCandidates,
    canMentionRolesAndEveryone,
  )
  const selectableCandidates = filterMentionCandidatesByPermission(
    candidates,
    canMentionRolesAndEveryone,
  )
  const selectableSearchResults = filterMentionCandidatesByPermission(
    searchResults,
    canMentionRolesAndEveryone,
  )
  const searchHasSettled =
    hasMentionQuery && resolvedSearchQuery === mentionQuery && !isMentionSearchPending
  const mentionSuggestions = mentionTrigger
    ? hasRemoteSearch
      ? searchHasSettled
        ? filterMentionCandidates(selectableSearchResults, mentionTrigger.query)
        : []
      : filterMentionCandidates(selectableCandidates, mentionTrigger.query)
    : []
  const canShowMentionSuggestions = Boolean(mentionTrigger) && (!hasRemoteSearch || hasMentionQuery)
  const showMentionSuggestions =
    canShowMentionSuggestions &&
    (mentionSuggestions.length > 0 ||
      (hasRemoteSearch && (isMentionSearchPending || searchHasSettled)) ||
      Boolean(onLoadMore))

  const reset = () => {
    setMentionTrigger(undefined)
    setActiveMentionIndex(0)
    setResolvedSearchQuery(undefined)
  }

  const updateDraft = (nextValue: string, cursor: number | null) => {
    onChange(nextValue)
    if (cursor === null) {
      reset()
      return
    }
    setMentionTrigger(findMentionTrigger(nextValue, cursor))
    setActiveMentionIndex(0)
  }

  const handleSelect = (nextValue: string, selectionStart: number, selectionEnd: number) => {
    if (selectionStart !== selectionEnd) {
      setMentionTrigger(undefined)
      return
    }
    setMentionTrigger(findMentionTrigger(nextValue, selectionStart))
  }

  const insertMention = (candidate: MentionCandidate) => {
    if (!mentionTrigger) return
    if (!canMentionRolesAndEveryone && isRoleOrEveryoneMentionCandidate(candidate)) return
    const nextSpacing = /\s/.test(value[mentionTrigger.end] ?? '') ? '' : ' '
    const replacedDraft = replaceMentionTrigger(value, mentionTrigger, candidate)
    const tokenEnd = mentionTrigger.start + candidate.token.length
    const nextDraft = `${replacedDraft.slice(0, tokenEnd)}${nextSpacing}${replacedDraft.slice(tokenEnd)}`
    const nextCursor = tokenEnd + nextSpacing.length
    const nextDisplayCursor = getMentionDraftDisplayOffset(
      nextDraft,
      draftMentionCandidates,
      nextCursor,
    )
    onChange(nextDraft)
    reset()
    queueMicrotask(() => {
      const editor = editorRef?.current
      if (!editor) {
        if (document.activeElement instanceof HTMLElement) document.activeElement.focus()
        return
      }
      editor.focus()
      editor.setSelectionRange(nextDisplayCursor, nextDisplayCursor)
    })
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (
      isMentionSearchPending &&
      mentionTrigger &&
      (event.key === 'Enter' || event.key === 'Tab')
    ) {
      event.preventDefault()
      return true
    }
    if (mentionSuggestions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveMentionIndex((current) => (current + 1) % mentionSuggestions.length)
        return true
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveMentionIndex(
          (current) => (current - 1 + mentionSuggestions.length) % mentionSuggestions.length,
        )
        return true
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault()
        const candidate = mentionSuggestions[activeMentionIndex]
        if (candidate) insertMention(candidate)
        return true
      }
    }
    if (event.key === 'Escape' && mentionTrigger) {
      event.preventDefault()
      reset()
      return true
    }
    return false
  }

  return {
    activeMentionIndex,
    draftMentionCandidates,
    handleKeyDown,
    handleSelect,
    insertMention,
    isRemoteSearch: hasRemoteSearch,
    isMentionSearchPending,
    mentionCandidates,
    mentionSuggestions,
    reset,
    showMentionSuggestions,
    updateDraft,
  }
}

function mergeMentionCandidates(...candidateLists: MentionCandidate[][]): MentionCandidate[] {
  const merged = new Map<string, MentionCandidate>()
  for (const candidateList of candidateLists) {
    for (const candidate of candidateList) {
      merged.set(`${candidate.kind}:${candidate.id}`, candidate)
    }
  }
  return [...merged.values()]
}
