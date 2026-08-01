import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import {
  createElement,
  useEffect,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
  type ReactNode,
} from 'react'

import type { GuildMemberSummary, GuildRoleSummary } from '@/features/guilds/guild-queries'
import {
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

export interface MentionTrigger {
  end: number
  query: string
  start: number
}

export interface MentionInputState {
  activeMentionIndex: number
  handleKeyDown: (event: ReactKeyboardEvent<HTMLTextAreaElement>) => boolean
  handleSelect: (value: string, selectionStart: number, selectionEnd: number) => void
  insertMention: (candidate: MentionCandidate) => void
  mentionSuggestions: MentionCandidate[]
  showMentionSuggestions: boolean
  reset: () => void
  updateDraft: (value: string, cursor: number | null) => void
}

/**
 * Loads the public member and role lists used by the composer and by message
 * rendering. The member endpoint is paginated; callers can expose
 * fetchNextPage when the first page does not contain the desired member.
 */
export function useGuildMentionCandidates(
  guildId: string | undefined,
  enabled = true,
  requiredUserIds: string[] = [],
) {
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

  return {
    candidates,
    fetchNextMembersPage: hasNextPage ? fetchNextPage : undefined,
    hasNextMembersPage: hasNextPage,
    isLoading: membersPending || rolesQuery.isPending,
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

export function renderMentionDraftContent(
  content: string,
  candidates: MentionCandidate[],
): ReactNode[] {
  const candidateByKey = new Map(
    candidates.map((candidate) => [`${candidate.kind}:${candidate.id}`, candidate]),
  )
  const parts: ReactNode[] = []
  const pattern = /<@!?([0-9]+)>|<@&([0-9]+)>|@everyone(?![\p{L}\p{N}_])/gu
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(content))) {
    const token = match[0]
    const candidate = match[1]
      ? candidateByKey.get(`user:${match[1]}`)
      : match[2]
        ? candidateByKey.get(`role:${match[2]}`)
        : candidateByKey.get('everyone:everyone')
    if (!candidate || isEscaped(content, match.index)) continue

    if (match.index > cursor) parts.push(content.slice(cursor, match.index))
    parts.push(
      createElement(
        'span',
        {
          className: 'rounded-control bg-brand-soft px-1 font-medium text-brand-text',
          key: `${match.index}:${token}`,
        },
        `@${candidate.label}`,
      ),
    )
    cursor = match.index + token.length
  }

  if (cursor < content.length) parts.push(content.slice(cursor))
  return parts
}

export function useMentionInput(
  value: string,
  onChange: (value: string) => void,
  candidates: MentionCandidate[],
  onLoadMore?: () => void,
  textareaRef?: RefObject<HTMLTextAreaElement | null>,
): MentionInputState {
  const [mentionTrigger, setMentionTrigger] = useState<MentionTrigger>()
  const [activeMentionIndex, setActiveMentionIndex] = useState(0)
  const mentionSuggestions = mentionTrigger
    ? filterMentionCandidates(candidates, mentionTrigger.query)
    : []
  const showMentionSuggestions =
    Boolean(mentionTrigger) && (mentionSuggestions.length > 0 || Boolean(onLoadMore))

  const reset = () => {
    setMentionTrigger(undefined)
    setActiveMentionIndex(0)
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
    const nextDraft = replaceMentionTrigger(value, mentionTrigger, candidate)
    const nextCursor = mentionTrigger.start + candidate.token.length
    onChange(nextDraft)
    reset()
    queueMicrotask(() => {
      const textarea =
        textareaRef?.current ??
        (document.activeElement instanceof HTMLTextAreaElement ? document.activeElement : undefined)
      if (!textarea) return
      textarea.focus()
      textarea.setSelectionRange(nextCursor, nextCursor)
    })
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
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
    handleKeyDown,
    handleSelect,
    insertMention,
    mentionSuggestions,
    reset,
    showMentionSuggestions,
    updateDraft,
  }
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
          className: 'rounded-control bg-brand-soft px-1 font-medium text-brand-text',
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
