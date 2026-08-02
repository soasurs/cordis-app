import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'

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
import type {
  MentionCandidate,
  MentionCandidateSearch,
  MentionTrigger,
} from '@/features/messages/mention-types'

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

function createEveryoneCandidate(): MentionCandidate {
  return {
    id: 'everyone',
    kind: 'everyone',
    label: 'everyone',
    secondaryLabel: 'Everyone who can view this channel',
    token: '@everyone',
  }
}
