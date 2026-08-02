import {
  infiniteQueryOptions,
  queryOptions,
  skipToken,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query'

import {
  listGuildChannelPermissionOverwrites,
  listGuildChannels,
  listGuildInvites,
  listGuildMemberRoles,
  listGuildMembers,
  listGuildRoleMembers,
  listGuildRoles,
  searchGuildMentionRoles,
  searchGuildMentionUsers,
  type GuildInvitePage,
  type GuildMemberPage,
} from '@/api/guild'
import type { GuildChannelSummary, GuildSummary } from '@/features/guilds/guild-query-types'

export const guildsQueryKey = ['guilds'] as const

export const guildsQueryOptions = queryOptions({
  initialData: [] as GuildSummary[],
  queryFn: skipToken,
  queryKey: guildsQueryKey,
  staleTime: Number.POSITIVE_INFINITY,
})

export function guildQueryKey(guildId: string) {
  return [...guildsQueryKey, guildId] as const
}

export function guildChannelsQueryKey(guildId: string) {
  return [...guildsQueryKey, guildId, 'channels'] as const
}

export function guildChannelLayoutRevisionQueryKey(guildId: string) {
  return [...guildChannelsQueryKey(guildId), 'layout-revision'] as const
}

export function guildChannelLayoutRevisionQueryOptions(guildId: string) {
  return queryOptions<
    number | undefined,
    Error,
    number | undefined,
    ReturnType<typeof guildChannelLayoutRevisionQueryKey>
  >({
    queryFn: skipToken,
    queryKey: guildChannelLayoutRevisionQueryKey(guildId),
  })
}

export function getGuildChannelLayoutRevision(queryClient: QueryClient, guildId: string) {
  return queryClient.getQueryData<number>(guildChannelLayoutRevisionQueryKey(guildId))
}

export function setGuildChannelLayoutRevision(
  queryClient: QueryClient,
  guildId: string,
  revision: number,
) {
  if (!Number.isSafeInteger(revision) || revision <= 0) {
    return false
  }

  const key = guildChannelLayoutRevisionQueryKey(guildId)
  const current = queryClient.getQueryData<number>(key)
  if (current !== undefined && current > revision) {
    return false
  }

  queryClient.setQueryData(key, revision)
  return true
}

export function guildChannelsQueryOptions(guildId: string) {
  return queryOptions({
    queryFn: async ({ client }) => {
      const snapshot = await listGuildChannels(guildId)
      if (Array.isArray(snapshot)) {
        return snapshot
      }
      const revisionAccepted = setGuildChannelLayoutRevision(
        client,
        guildId,
        snapshot.channelLayoutRevision,
      )
      if (!revisionAccepted) {
        const currentChannels = client.getQueryData<GuildChannelSummary[]>(
          guildChannelsQueryKey(guildId),
        )
        if (currentChannels !== undefined) {
          return currentChannels
        }
      }
      return snapshot.channels
    },
    queryKey: guildChannelsQueryKey(guildId),
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export function guildChannelOverwritesQueryKey(guildId: string, channelId: string) {
  return [...guildChannelsQueryKey(guildId), channelId, 'overwrites'] as const
}

export function guildChannelOverwritesQueryOptions(guildId: string, channelId: string) {
  return queryOptions({
    queryFn: () => listGuildChannelPermissionOverwrites(channelId),
    queryKey: guildChannelOverwritesQueryKey(guildId, channelId),
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export function guildMembersQueryKey(guildId: string) {
  return [...guildsQueryKey, guildId, 'members'] as const
}

export function guildMembersInfiniteQueryOptions(guildId: string) {
  return infiniteQueryOptions<
    GuildMemberPage,
    Error,
    InfiniteData<GuildMemberPage>,
    ReturnType<typeof guildMembersQueryKey>,
    string | undefined
  >({
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listGuildMembers(guildId, pageParam),
    queryKey: guildMembersQueryKey(guildId),
    staleTime: 30_000,
  })
}

export function guildMentionUsersQueryKey(guildId: string, channelId: string, query: string) {
  return [...guildsQueryKey, guildId, 'mention-users', channelId, query] as const
}

export function guildMentionUsersQueryOptions(guildId: string, channelId: string, query: string) {
  return queryOptions({
    queryFn: () => searchGuildMentionUsers(guildId, channelId, query),
    queryKey: guildMentionUsersQueryKey(guildId, channelId, query),
    staleTime: 30_000,
  })
}

export function guildInvitesQueryKey(guildId: string) {
  return [...guildsQueryKey, guildId, 'invites'] as const
}

export function guildInvitesInfiniteQueryOptions(guildId: string) {
  return infiniteQueryOptions<
    GuildInvitePage,
    Error,
    InfiniteData<GuildInvitePage>,
    ReturnType<typeof guildInvitesQueryKey>,
    string | undefined
  >({
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listGuildInvites(guildId, pageParam),
    queryKey: guildInvitesQueryKey(guildId),
    staleTime: 30_000,
  })
}

export function guildMemberRolesQueryKey(guildId: string, userId: string) {
  return [...guildMembersQueryKey(guildId), userId, 'roles'] as const
}

export function guildMemberRolesQueryOptions(guildId: string, userId: string) {
  return queryOptions({
    queryFn: () => listGuildMemberRoles(guildId, userId),
    queryKey: guildMemberRolesQueryKey(guildId, userId),
    staleTime: 30_000,
  })
}

export function guildRoleMembersQueryKey(guildId: string, roleId: string) {
  return [...guildRolesQueryKey(guildId), roleId, 'members'] as const
}

export function guildRoleMembersInfiniteQueryOptions(guildId: string, roleId: string) {
  return infiniteQueryOptions<
    GuildMemberPage,
    Error,
    InfiniteData<GuildMemberPage>,
    ReturnType<typeof guildRoleMembersQueryKey>,
    string | undefined
  >({
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listGuildRoleMembers(guildId, roleId, pageParam),
    queryKey: guildRoleMembersQueryKey(guildId, roleId),
    staleTime: 30_000,
  })
}

export function guildRolesQueryKey(guildId: string) {
  return [...guildsQueryKey, guildId, 'roles'] as const
}

export function guildRolesQueryOptions(guildId: string) {
  return queryOptions({
    queryFn: () => listGuildRoles(guildId),
    queryKey: guildRolesQueryKey(guildId),
    staleTime: 30_000,
  })
}

export function guildMentionRolesQueryKey(guildId: string, query: string) {
  return [...guildsQueryKey, guildId, 'mention-roles', query] as const
}

export function guildMentionRolesQueryOptions(guildId: string, query: string) {
  return queryOptions({
    queryFn: () => searchGuildMentionRoles(guildId, query),
    queryKey: guildMentionRolesQueryKey(guildId, query),
    staleTime: 30_000,
  })
}
