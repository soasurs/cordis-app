import type { QueryClient } from '@tanstack/react-query'

import {
  channelOverwriteAffectsVisibleChannels,
  channelOverwriteRemovalAffectsVisibleChannels,
  rolePermissionsAffectVisibleChannels,
} from '@/features/guilds/channel-visibility'
import { guildChannelOverwritesQueryKey } from '@/features/guilds/guild-query-options'
import type {
  GuildChannelOverwriteSummary,
  GuildRoleSummary,
} from '@/features/guilds/guild-query-types'

export function ensureEmptyGuildChannelOverwrites(
  queryClient: QueryClient,
  guildId: string,
  channelId: string,
) {
  const key = guildChannelOverwritesQueryKey(guildId, channelId)
  if (queryClient.getQueryData(key) === undefined) {
    queryClient.setQueryData<GuildChannelOverwriteSummary[]>(key, [])
  }
}

export function shouldRefreshChannelsForOverwriteUpdate(
  cacheSeeded: boolean,
  previous: { allow: string; deny: string } | undefined,
  next: { allow: string; deny: string },
) {
  // Without a seeded overwrite list we cannot compare the previous View Channel
  // state, so refresh eagerly.
  if (!cacheSeeded) return true
  return channelOverwriteAffectsVisibleChannels(previous, next)
}

export function shouldRefreshChannelsForOverwriteRemoval(
  cacheSeeded: boolean,
  previous: { allow: string; deny: string } | undefined,
) {
  if (!cacheSeeded) return true
  return previous ? channelOverwriteRemovalAffectsVisibleChannels(previous) : false
}

export function shouldRefreshChannelsForRoleUpdate(
  previous: GuildRoleSummary | undefined,
  next: GuildRoleSummary,
) {
  // Creating a role alone does not change visibility until it is assigned.
  if (!previous) return false
  return rolePermissionsAffectVisibleChannels(previous.permissions, next.permissions)
}

export function upsertOverwriteByRevision(
  current: GuildChannelOverwriteSummary[],
  next: GuildChannelOverwriteSummary,
) {
  const existing = current.find(
    (item) => item.appliesTo === next.appliesTo && item.appliesToId === next.appliesToId,
  )
  if (existing && existing.revision > next.revision) {
    return current
  }

  if (existing) {
    return current.map((item) =>
      item.appliesTo === next.appliesTo && item.appliesToId === next.appliesToId ? next : item,
    )
  }

  return [...current, next]
}

export function upsertByRevision<T extends { id: string; revision: number }>(
  current: T[],
  next: T,
) {
  const existing = current.find((item) => item.id === next.id)
  if (existing && existing.revision > next.revision) {
    return current
  }

  if (existing) {
    return current.map((item) => (item.id === next.id ? next : item))
  }

  return [...current, next]
}

export function resolveMemberRolesFromIds(roles: GuildRoleSummary[], roleIds: string[]) {
  const byId = new Map(roles.map((role) => [role.id, role]))
  return roleIds.flatMap((roleId) => {
    const role = byId.get(roleId)
    return role ? [role] : []
  })
}

function isGuildMemberRolesQueryKey(queryKey: readonly unknown[], guildId: string) {
  return (
    queryKey[0] === 'guilds' &&
    queryKey[1] === guildId &&
    queryKey[2] === 'members' &&
    typeof queryKey[3] === 'string' &&
    queryKey[4] === 'roles'
  )
}

export function patchGuildMemberRoleCaches(
  queryClient: QueryClient,
  guildId: string,
  role: GuildRoleSummary,
) {
  queryClient.setQueriesData<GuildRoleSummary[]>(
    {
      predicate: (query) => isGuildMemberRolesQueryKey(query.queryKey, guildId),
    },
    (current) => {
      if (!current?.some((item) => item.id === role.id)) return current
      return upsertByRevision(current, role)
    },
  )
}

export function stripGuildMemberRoleCaches(
  queryClient: QueryClient,
  guildId: string,
  roleId: string,
) {
  queryClient.setQueriesData<GuildRoleSummary[]>(
    {
      predicate: (query) => isGuildMemberRolesQueryKey(query.queryKey, guildId),
    },
    (current) => current?.filter((role) => role.id !== roleId),
  )
}
