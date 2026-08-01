import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createElement,
  useCallback,
  useEffect,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
  type ReactNode,
} from 'react'

import type {
  GuildMemberSummary,
  GuildMentionUserSummary,
  GuildRoleSummary,
} from '@/features/guilds/guild-queries'
import {
  guildMentionRolesQueryOptions,
  guildMentionUsersQueryOptions,
  guildMembersInfiniteQueryOptions,
  guildRolesQueryOptions,
} from '@/features/guilds/guild-queries'
import type { ChannelMessageSummary } from '@/features/messages/message-queries'

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

export function isRoleOrEveryoneMentionCandidate(candidate: MentionCandidate) {
  return candidate.kind === 'everyone' || candidate.kind === 'role'
}

export function filterMentionCandidatesByPermission(
  candidates: MentionCandidate[],
  canMentionRolesAndEveryone: boolean,
) {
  return canMentionRolesAndEveryone
    ? candidates
    : candidates.filter((candidate) => !isRoleOrEveryoneMentionCandidate(candidate))
}

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

const MENTION_SEARCH_DEBOUNCE_MS = 200

/**
 * Loads known member and role labels for rendering existing messages and
 * exposes the channel-aware search used by compose/edit inputs. The member
 * endpoint is paginated; callers can expose fetchNextPage when the first page
 * does not contain the desired member.
 */
export function useGuildMentionCandidates(
  guildId: string | undefined,
  channelId: string | undefined,
  enabled = true,
  requiredUserIds: string[] = [],
) {
  const queryClient = useQueryClient()
  const isEnabled = Boolean(guildId) && enabled
  const membersQuery = useInfiniteQuery({
    ...guildMembersInfiniteQueryOptions(guildId ?? ''),
    enabled: isEnabled,
  })
  const rolesQuery = useQuery({
    ...guildRolesQueryOptions(guildId ?? ''),
    enabled: isEnabled,
  })
  const {
    data: membersData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending: membersPending,
  } = membersQuery
  const members = membersData?.pages.flatMap((page) => page.members) ?? []
  const roles = rolesQuery.data ?? []
  const candidates = createMentionCandidates(members, roles)
  const loadedUserIds = new Set(
    candidates.filter((candidate) => candidate.kind === 'user').map((candidate) => candidate.id),
  )
  const hasMissingRequiredUsers = requiredUserIds.some((userId) => !loadedUserIds.has(userId))

  useEffect(() => {
    if (!isEnabled || !hasMissingRequiredUsers || !hasNextPage) return
    if (isFetchingNextPage) return
    void fetchNextPage()
  }, [fetchNextPage, hasMissingRequiredUsers, hasNextPage, isEnabled, isFetchingNextPage])

  const searchMentionCandidates = useCallback<MentionCandidateSearch>(
    async (query) => {
      if (!guildId || !channelId) return []

      const [users, roles] = await Promise.all([
        queryClient.fetchQuery(guildMentionUsersQueryOptions(guildId, channelId, query)),
        queryClient.fetchQuery(guildMentionRolesQueryOptions(guildId, query)),
      ])
      return createMentionCandidatesFromSearch(users, roles)
    },
    [channelId, guildId, queryClient],
  )

  return {
    candidates,
    fetchNextMembersPage: hasNextPage ? fetchNextPage : undefined,
    hasNextMembersPage: hasNextPage,
    isLoading: membersPending || rolesQuery.isPending,
    searchMentionCandidates,
  }
}

export function createMentionCandidates(
  members: GuildMemberSummary[],
  roles: GuildRoleSummary[],
): MentionCandidate[] {
  const candidates: MentionCandidate[] = [
    {
      id: 'everyone',
      kind: 'everyone',
      label: 'everyone',
      secondaryLabel: 'Everyone who can view this channel',
      token: '@everyone',
    },
  ]

  for (const role of roles) {
    if (role.isDefault) continue
    candidates.push({
      id: role.id,
      kind: 'role',
      label: role.name,
      secondaryLabel: 'Role',
      token: `<@&${role.id}>`,
    })
  }

  for (const member of members) {
    const profile = member.profile
    const label = member.nickname || profile?.name || profile?.username || `User ${member.userId}`
    const secondaryLabel = profile?.username ? `@${profile.username}` : undefined
    candidates.push({
      id: member.userId,
      kind: 'user',
      label,
      secondaryLabel,
      token: `<@${member.userId}>`,
    })
  }

  return candidates
}

export function createMentionCandidatesFromSearch(
  users: GuildMentionUserSummary[],
  roles: GuildRoleSummary[],
): MentionCandidate[] {
  const candidates: MentionCandidate[] = [createEveryoneCandidate()]

  for (const role of roles) {
    if (role.isDefault) continue
    candidates.push({
      id: role.id,
      kind: 'role',
      label: role.name,
      secondaryLabel: 'Role',
      token: `<@&${role.id}>`,
    })
  }

  for (const user of users) {
    const label = user.nickname || user.name || user.username || `User ${user.userId}`
    candidates.push({
      id: user.userId,
      kind: 'user',
      label,
      secondaryLabel: user.username ? `@${user.username}` : undefined,
      token: `<@${user.userId}>`,
    })
  }

  return candidates
}

export function findMentionTrigger(value: string, cursor: number): MentionTrigger | undefined {
  const prefix = value.slice(0, cursor)
  const match = /(?:^|[\s([{"'`])@([^\s@<>]*)$/.exec(prefix)
  if (!match) return undefined

  const atOffset = match[0].lastIndexOf('@')
  return {
    end: cursor,
    query: match[1] ?? '',
    start: match.index + atOffset,
  }
}

export function extractDirectMentionUserIds(content: string): string[] {
  const ids = new Set<string>()
  const pattern = /<@!?([0-9]+)>/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(content))) {
    if (!isEscaped(content, match.index) && match[1]) ids.add(match[1])
  }
  return [...ids]
}

/** Whether content contains an unescaped role or @everyone mention. */
export function containsRoleOrEveryoneMention(content: string) {
  return extractRoleOrEveryoneMentionTokens(content).size > 0
}

export function containsNewRoleOrEveryoneMention(previousContent: string, nextContent: string) {
  const previousTokens = extractRoleOrEveryoneMentionTokens(previousContent)
  for (const token of extractRoleOrEveryoneMentionTokens(nextContent)) {
    if (!previousTokens.has(token)) return true
  }
  return false
}

export function filterMentionCandidates(
  candidates: MentionCandidate[],
  query: string,
): MentionCandidate[] {
  const normalized = query.trim().toLocaleLowerCase()
  if (!normalized) return candidates

  return candidates.filter((candidate) => {
    const label = candidate.label.toLocaleLowerCase()
    const secondaryLabel = candidate.secondaryLabel?.toLocaleLowerCase() ?? ''
    return label.includes(normalized) || secondaryLabel.includes(normalized)
  })
}

export function replaceMentionTrigger(
  value: string,
  trigger: MentionTrigger,
  candidate: MentionCandidate,
) {
  return `${value.slice(0, trigger.start)}${candidate.token}${value.slice(trigger.end)}`
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

function extractRoleOrEveryoneMentionTokens(content: string) {
  const tokens = new Set<string>()
  const pattern = /<@&[0-9]+>|@everyone(?![\p{L}\p{N}_])/gu
  let match: RegExpExecArray | null
  while ((match = pattern.exec(content))) {
    if (isEscaped(content, match.index)) continue
    if (match[0] === '@everyone' && !isMentionBoundary(content, match.index)) continue
    tokens.add(match[0])
  }
  return tokens
}

function createEveryoneCandidate(): MentionCandidate {
  return {
    id: 'everyone',
    kind: 'everyone',
    label: 'everyone',
    secondaryLabel: 'Everyone who can view this channel',
    token: '@everyone',
  }
}

function mergeMentionCandidates(...candidateLists: MentionCandidate[][]): MentionCandidate[] {
  const candidates = new Map<string, MentionCandidate>()
  for (const candidateList of candidateLists) {
    for (const candidate of candidateList) {
      candidates.set(`${candidate.kind}:${candidate.id}`, candidate)
    }
  }
  return [...candidates.values()]
}

export function renderMessageContent(
  message: Pick<
    ChannelMessageSummary,
    'content' | 'mentionEveryone' | 'mentionRoleIds' | 'mentionUserIds'
  >,
  candidates: MentionCandidate[],
): ReactNode[] {
  const parts: ReactNode[] = []
  const userMentionIds = new Set(message.mentionUserIds)
  const roleMentionIds = new Set(message.mentionRoleIds)
  const candidateByKey = new Map(
    candidates.map((candidate) => [`${candidate.kind}:${candidate.id}`, candidate]),
  )
  const pattern = /<@!?([0-9]+)>|<@&([0-9]+)>|@everyone(?![\p{L}\p{N}_])/gu
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(message.content))) {
    const token = match[0]
    const userId = match[1]
    const roleId = match[2]
    const isEveryone = token === '@everyone'
    const isAccepted =
      !isEscaped(message.content, match.index) &&
      (isEveryone
        ? message.mentionEveryone && isMentionBoundary(message.content, match.index)
        : userId
          ? userMentionIds.has(userId)
          : Boolean(roleId && roleMentionIds.has(roleId)))
    if (!isAccepted) continue

    if (match.index > cursor) parts.push(message.content.slice(cursor, match.index))

    const kind: MentionCandidateKind = isEveryone ? 'everyone' : userId ? 'user' : 'role'
    const id = isEveryone ? 'everyone' : (userId ?? roleId ?? '')
    const candidate = candidateByKey.get(`${kind}:${id}`)
    const label = candidate?.label ?? id
    parts.push(
      createElement(
        'span',
        {
          className:
            'rounded-md bg-brand-soft px-1.5 py-0.5 align-middle font-medium text-brand-text',
          key: `${match.index}:${token}`,
          title: candidate?.secondaryLabel,
        },
        `@${label}`,
      ),
    )
    cursor = match.index + token.length
  }

  if (cursor < message.content.length) parts.push(message.content.slice(cursor))
  return parts
}

function isMentionBoundary(content: string, index: number) {
  const previous = content[index - 1]
  return !previous || !/[\p{L}\p{N}_]/u.test(previous)
}

function isEscaped(content: string, index: number) {
  let slashCount = 0
  for (let cursor = index - 1; cursor >= 0 && content[cursor] === '\\'; cursor -= 1) {
    slashCount += 1
  }
  return slashCount % 2 === 1
}
