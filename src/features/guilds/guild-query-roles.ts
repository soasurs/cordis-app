import type { QueryClient } from '@tanstack/react-query'

import type { GuildRolePayload } from '@/gateway'
import { guildMemberRolesQueryKey, guildRolesQueryKey } from '@/features/guilds/guild-query-options'
import type { GuildRoleSummary } from '@/features/guilds/guild-query-types'
import {
  invalidateGuildChannelsFromGateway,
  invalidateGuildMemberRolesFromGateway,
} from '@/features/guilds/guild-query-invalidation'
import {
  patchGuildMemberRoleCaches,
  shouldRefreshChannelsForRoleUpdate,
  stripGuildMemberRoleCaches,
  upsertByRevision,
} from '@/features/guilds/guild-query-helpers'
import { toRoleSummary } from '@/features/guilds/guild-query-transform'

export function upsertGuildRoleFromApi(queryClient: QueryClient, role: GuildRoleSummary) {
  const existing = queryClient
    .getQueryData<GuildRoleSummary[]>(guildRolesQueryKey(role.guildId))
    ?.find((item) => item.id === role.id)

  queryClient.setQueryData<GuildRoleSummary[]>(guildRolesQueryKey(role.guildId), (current = []) =>
    upsertByRevision(current, role),
  )
  patchGuildMemberRoleCaches(queryClient, role.guildId, role)
  if (shouldRefreshChannelsForRoleUpdate(existing, role)) {
    invalidateGuildChannelsFromGateway(queryClient, role.guildId)
  }
}

export function upsertGuildRolesFromApi(
  queryClient: QueryClient,
  guildId: string,
  roles: GuildRoleSummary[],
) {
  const currentRoles =
    queryClient.getQueryData<GuildRoleSummary[]>(guildRolesQueryKey(guildId)) ?? []
  const shouldRefresh = roles.some((role) =>
    shouldRefreshChannelsForRoleUpdate(
      currentRoles.find((item) => item.id === role.id),
      role,
    ),
  )

  queryClient.setQueryData<GuildRoleSummary[]>(guildRolesQueryKey(guildId), (current = []) =>
    roles.reduce((nextRoles, role) => upsertByRevision(nextRoles, role), current),
  )
  for (const role of roles) {
    patchGuildMemberRoleCaches(queryClient, guildId, role)
  }
  if (shouldRefresh) {
    invalidateGuildChannelsFromGateway(queryClient, guildId)
  }
}

export function removeGuildRoleFromApi(queryClient: QueryClient, guildId: string, roleId: string) {
  queryClient.setQueryData<GuildRoleSummary[]>(guildRolesQueryKey(guildId), (current = []) =>
    current.filter((role) => role.id !== roleId),
  )
  stripGuildMemberRoleCaches(queryClient, guildId, roleId)
  // Deleting a role can uncover channels via role-targeted overwrites even when
  // the role itself lacked View Channel / Administrator.
  invalidateGuildChannelsFromGateway(queryClient, guildId)
}

export function upsertGuildRoleFromGateway(queryClient: QueryClient, role: GuildRolePayload) {
  const existing = queryClient
    .getQueryData<GuildRoleSummary[]>(guildRolesQueryKey(role.guild_id))
    ?.find((item) => item.id === role.id)

  if (existing && existing.revision > role.revision) {
    return
  }

  const summary = toRoleSummary(role)
  queryClient.setQueryData<GuildRoleSummary[]>(guildRolesQueryKey(role.guild_id), (current = []) =>
    upsertByRevision(current, summary),
  )
  patchGuildMemberRoleCaches(queryClient, role.guild_id, summary)
  if (shouldRefreshChannelsForRoleUpdate(existing, summary)) {
    invalidateGuildChannelsFromGateway(queryClient, role.guild_id)
  }
}

export function removeGuildRoleFromGateway(
  queryClient: QueryClient,
  guildId: string,
  roleId: string,
) {
  removeGuildRoleFromApi(queryClient, guildId, roleId)
}

export function replaceGuildMemberRolesFromGateway(
  queryClient: QueryClient,
  guildId: string,
  userId: string,
  roleIds: string[],
) {
  const guildRoles = queryClient.getQueryData<GuildRoleSummary[]>(guildRolesQueryKey(guildId))
  if (!guildRoles) {
    invalidateGuildMemberRolesFromGateway(queryClient, guildId, userId)
    return
  }

  const byId = new Map(guildRoles.map((role) => [role.id, role]))
  const next: GuildRoleSummary[] = []
  for (const roleId of roleIds) {
    const role = byId.get(roleId)
    if (!role) {
      invalidateGuildMemberRolesFromGateway(queryClient, guildId, userId)
      return
    }
    next.push(role)
  }

  queryClient.setQueryData<GuildRoleSummary[]>(guildMemberRolesQueryKey(guildId, userId), next)
}

export function setGuildMemberRoleAssignment(
  queryClient: QueryClient,
  guildId: string,
  userId: string,
  role: GuildRoleSummary,
  assigned: boolean,
) {
  queryClient.setQueryData<GuildRoleSummary[]>(
    guildMemberRolesQueryKey(guildId, userId),
    (current = []) =>
      assigned
        ? upsertByRevision(current, role)
        : current.filter((currentRole) => currentRole.id !== role.id),
  )
}
