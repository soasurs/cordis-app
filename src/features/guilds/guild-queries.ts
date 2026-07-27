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
  type Guild,
  type GuildChannel,
  type GuildChannelPermissionOverwrite,
  type GuildInvite,
  type GuildInvitePage,
  type GuildMember,
  type GuildMemberPage,
  type GuildRole,
} from '@/api/guild'
import {
  channelOverwriteAffectsVisibleChannels,
  channelOverwriteRemovalAffectsVisibleChannels,
  rolePermissionsAffectVisibleChannels,
} from '@/features/guilds/channel-visibility'
import type {
  GatewayReadyData,
  GuildChannelOverwriteDeletedPayload,
  GuildChannelOverwritePayload,
  GuildChannelPayload,
  GuildDeletedPayload,
  GuildPayload,
  GuildRolePayload,
  ReadyChannel,
  ReadyPermissionOverwrite,
  ReadyRole,
} from '@/gateway'

export interface GuildSummary {
  createdAt: number
  description: string
  iconAssetId: string
  id: string
  name: string
  ownerId: string
  revision: number
  updatedAt: number
}

export type GuildChannelSummary = GuildChannel
export type GuildChannelOverwriteSummary = GuildChannelPermissionOverwrite
export type GuildInviteSummary = GuildInvite
export type GuildMemberSummary = GuildMember
export type GuildRoleSummary = GuildRole

export const guildsQueryKey = ['guilds'] as const

export const guildsQueryOptions = queryOptions({
  initialData: [] as GuildSummary[],
  queryFn: skipToken,
  queryKey: guildsQueryKey,
  staleTime: Number.POSITIVE_INFINITY,
})

export function guildChannelsQueryKey(guildId: string) {
  return [...guildsQueryKey, guildId, 'channels'] as const
}

function guildQueryKey(guildId: string) {
  return [...guildsQueryKey, guildId] as const
}

export function guildChannelsQueryOptions(guildId: string) {
  return queryOptions({
    queryFn: () => listGuildChannels(guildId),
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

export function upsertGuildChannelOverwriteFromApi(
  queryClient: QueryClient,
  overwrite: GuildChannelOverwriteSummary,
) {
  const key = guildChannelOverwritesQueryKey(overwrite.guildId, overwrite.channelId)
  const current = queryClient.getQueryData<GuildChannelOverwriteSummary[]>(key)
  const existing = current?.find(
    (item) => item.appliesTo === overwrite.appliesTo && item.appliesToId === overwrite.appliesToId,
  )

  upsertGuildChannelOverwrite(queryClient, overwrite)
  if (shouldRefreshChannelsForOverwriteUpdate(current !== undefined, existing, overwrite)) {
    invalidateGuildChannelsFromGateway(queryClient, overwrite.guildId)
  }
}

export function removeGuildChannelOverwriteFromApi(
  queryClient: QueryClient,
  guildId: string,
  channelId: string,
  appliesTo: GuildChannelOverwriteSummary['appliesTo'],
  appliesToId: string,
) {
  const key = guildChannelOverwritesQueryKey(guildId, channelId)
  const current = queryClient.getQueryData<GuildChannelOverwriteSummary[]>(key)
  const existing = current?.find(
    (item) => item.appliesTo === appliesTo && item.appliesToId === appliesToId,
  )

  removeGuildChannelOverwrite(queryClient, guildId, channelId, appliesTo, appliesToId)
  if (shouldRefreshChannelsForOverwriteRemoval(current !== undefined, existing)) {
    invalidateGuildChannelsFromGateway(queryClient, guildId)
  }
}

export function upsertGuildChannelOverwriteFromGateway(
  queryClient: QueryClient,
  overwrite: GuildChannelOverwritePayload,
) {
  const appliesTo = toOverwriteAppliesTo(overwrite.applies_to)
  const key = guildChannelOverwritesQueryKey(overwrite.guild_id, overwrite.channel_id)
  const current = queryClient.getQueryData<GuildChannelOverwriteSummary[]>(key)
  const existing = current?.find(
    (item) => item.appliesTo === appliesTo && item.appliesToId === overwrite.applies_to_id,
  )

  if (existing && existing.revision > overwrite.revision) {
    return
  }

  const next = {
    allow: overwrite.allow,
    appliesTo,
    appliesToId: overwrite.applies_to_id,
    channelId: overwrite.channel_id,
    createdAt: existing?.createdAt ?? overwrite.updated_at,
    deny: overwrite.deny,
    guildId: overwrite.guild_id,
    revision: overwrite.revision,
    updatedAt: overwrite.updated_at,
  } satisfies GuildChannelOverwriteSummary

  upsertGuildChannelOverwrite(queryClient, next)
  if (shouldRefreshChannelsForOverwriteUpdate(current !== undefined, existing, next)) {
    invalidateGuildChannelsFromGateway(queryClient, overwrite.guild_id)
  }
}

export function removeGuildChannelOverwriteFromGateway(
  queryClient: QueryClient,
  overwrite: GuildChannelOverwriteDeletedPayload,
) {
  const appliesTo = toOverwriteAppliesTo(overwrite.applies_to)
  const key = guildChannelOverwritesQueryKey(overwrite.guild_id, overwrite.channel_id)
  const current = queryClient.getQueryData<GuildChannelOverwriteSummary[]>(key)
  const existing = current?.find(
    (item) => item.appliesTo === appliesTo && item.appliesToId === overwrite.applies_to_id,
  )

  removeGuildChannelOverwrite(
    queryClient,
    overwrite.guild_id,
    overwrite.channel_id,
    appliesTo,
    overwrite.applies_to_id,
  )
  if (shouldRefreshChannelsForOverwriteRemoval(current !== undefined, existing)) {
    invalidateGuildChannelsFromGateway(queryClient, overwrite.guild_id)
  }
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

export function prependGuildInviteFromApi(queryClient: QueryClient, invite: GuildInviteSummary) {
  queryClient.setQueryData<InfiniteData<GuildInvitePage>>(
    guildInvitesQueryKey(invite.guildId),
    (current) => {
      if (!current) {
        return {
          pageParams: [undefined],
          pages: [{ invites: [invite] }],
        }
      }

      const [firstPage, ...restPages] = current.pages
      const invites = [
        invite,
        ...(firstPage?.invites ?? []).filter((item) => item.id !== invite.id),
      ]

      return {
        ...current,
        pages: [{ invites, nextCursor: firstPage?.nextCursor }, ...restPages],
      }
    },
  )
}

export function removeGuildInviteFromApi(queryClient: QueryClient, guildId: string, code: string) {
  queryClient.setQueryData<InfiniteData<GuildInvitePage>>(
    guildInvitesQueryKey(guildId),
    (current) => {
      if (!current) return current

      return {
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          invites: page.invites.filter((invite) => invite.code !== code),
        })),
      }
    },
  )
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

/** Prepend newly assigned members into the role-members infinite cache. */
export function addGuildRoleMembersFromApi(
  queryClient: QueryClient,
  guildId: string,
  roleId: string,
  members: GuildMemberSummary[],
) {
  if (members.length === 0) return

  queryClient.setQueryData<InfiniteData<GuildMemberPage>>(
    guildRoleMembersQueryKey(guildId, roleId),
    (current) => {
      if (!current) {
        return {
          pageParams: [undefined],
          pages: [{ members, nextCursor: undefined }],
        }
      }

      const existingIds = new Set(
        current.pages.flatMap((page) => page.members.map((member) => member.userId)),
      )
      const toAdd = members.filter((member) => !existingIds.has(member.userId))
      if (toAdd.length === 0) return current

      const [firstPage, ...restPages] = current.pages
      return {
        ...current,
        pages: [
          {
            members: [...toAdd, ...(firstPage?.members ?? [])],
            nextCursor: firstPage?.nextCursor,
          },
          ...restPages,
        ],
      }
    },
  )
}

/** Drop members from the role-members infinite cache after a successful remove. */
export function removeGuildRoleMembersFromApi(
  queryClient: QueryClient,
  guildId: string,
  roleId: string,
  userIds: readonly string[],
) {
  if (userIds.length === 0) return
  const removeIds = new Set(userIds)

  queryClient.setQueryData<InfiniteData<GuildMemberPage>>(
    guildRoleMembersQueryKey(guildId, roleId),
    (current) => {
      if (!current) return current
      return {
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          members: page.members.filter((member) => !removeIds.has(member.userId)),
        })),
      }
    },
  )
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

export function invalidateGuildMembersFromGateway(queryClient: QueryClient, guildId: string) {
  void queryClient.invalidateQueries({ queryKey: guildMembersQueryKey(guildId) })
}

/** Re-pull visible channels after View Channel / Administrator access may have changed. */
export function invalidateGuildChannelsFromGateway(queryClient: QueryClient, guildId: string) {
  void queryClient.invalidateQueries({
    // Overwrites keys are nested under this prefix; exact keeps them untouched.
    exact: true,
    queryKey: guildChannelsQueryKey(guildId),
    // Permission changes must refresh even if the guild page query is inactive.
    refetchType: 'all',
  })
}

export function invalidateGuildChannelOverwritesFromGateway(
  queryClient: QueryClient,
  guildId: string,
  channelId: string,
) {
  void queryClient.invalidateQueries({
    queryKey: guildChannelOverwritesQueryKey(guildId, channelId),
  })
}

export function invalidateGuildMemberRolesFromGateway(
  queryClient: QueryClient,
  guildId: string,
  userId: string,
) {
  void queryClient.invalidateQueries({ queryKey: guildMemberRolesQueryKey(guildId, userId) })
}

/**
 * Replace a member's assigned roles from a role-id list, resolving summaries
 * against the guild role cache. Falls back to invalidation when a role id is
 * missing so a race cannot silently drop assignments.
 */
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

export function replaceGuildsFromReady(queryClient: QueryClient, ready: GatewayReadyData) {
  const previousGuildIds = queryClient
    .getQueryData<GuildSummary[]>(guildsQueryKey)
    ?.map((guild) => guild.id)

  queryClient.setQueryData<GuildSummary[]>(guildsQueryKey, ready.guilds.map(toGuildSummary))

  const nextGuildIds = new Set(ready.guilds.map((guild) => guild.id))
  for (const guildId of previousGuildIds ?? []) {
    if (!nextGuildIds.has(guildId)) {
      queryClient.removeQueries({ queryKey: guildQueryKey(guildId) })
    }
  }

  for (const guild of ready.guilds) {
    const previousChannelIds =
      queryClient
        .getQueryData<GuildChannelSummary[]>(guildChannelsQueryKey(guild.id))
        ?.map((channel) => channel.id) ?? []
    const nextChannelIds = new Set(guild.channels.map((channel) => channel.id))
    const roles = guild.roles.map(toRoleSummary)
    const overwritesByChannel = new Map<string, GuildChannelOverwriteSummary[]>()

    for (const overwrite of guild.permission_overwrites) {
      const summary = toOverwriteSummary(overwrite)
      const current = overwritesByChannel.get(summary.channelId)
      if (current) {
        current.push(summary)
      } else {
        overwritesByChannel.set(summary.channelId, [summary])
      }
    }

    queryClient.setQueryData<GuildChannelSummary[]>(
      guildChannelsQueryKey(guild.id),
      guild.channels.map(toChannelSummary),
    )
    queryClient.setQueryData<GuildRoleSummary[]>(guildRolesQueryKey(guild.id), roles)
    queryClient.setQueryData<GuildRoleSummary[]>(
      guildMemberRolesQueryKey(guild.id, ready.user_id),
      resolveMemberRolesFromIds(roles, guild.member_role_ids),
    )

    for (const channel of guild.channels) {
      queryClient.setQueryData<GuildChannelOverwriteSummary[]>(
        guildChannelOverwritesQueryKey(guild.id, channel.id),
        overwritesByChannel.get(channel.id) ?? [],
      )
    }

    for (const channelId of previousChannelIds) {
      if (!nextChannelIds.has(channelId)) {
        queryClient.removeQueries({
          queryKey: guildChannelOverwritesQueryKey(guild.id, channelId),
        })
      }
    }
  }
}

export function upsertGuildFromApi(queryClient: QueryClient, guild: Guild) {
  upsertGuild(queryClient, guild)
}

export function upsertGuildFromGateway(queryClient: QueryClient, guild: GuildPayload) {
  upsertGuild(queryClient, {
    createdAt: guild.created_at,
    description: guild.description,
    iconAssetId: guild.icon_asset_id,
    id: guild.id,
    name: guild.name,
    ownerId: guild.owner_id,
    revision: guild.revision,
    updatedAt: guild.updated_at,
  })
}

export function removeGuildFromGateway(queryClient: QueryClient, guild: GuildDeletedPayload) {
  queryClient.setQueryData<GuildSummary[]>(guildsQueryKey, (current = []) =>
    current.filter((item) => item.id !== guild.id),
  )
  queryClient.removeQueries({ queryKey: guildQueryKey(guild.id) })
}

export function upsertGuildChannelFromGateway(
  queryClient: QueryClient,
  channel: GuildChannelPayload,
) {
  const nextChannel = toChannelSummary(channel)
  const channelsKey = guildChannelsQueryKey(channel.guild_id)
  const isNew = !queryClient
    .getQueryData<GuildChannelSummary[]>(channelsKey)
    ?.some((item) => item.id === channel.id)

  queryClient.setQueryData<GuildChannelSummary[]>(channelsKey, (current = []) =>
    upsertByRevision(current, nextChannel),
  )

  if (isNew) {
    ensureEmptyGuildChannelOverwrites(queryClient, channel.guild_id, channel.id)
  }
}

export function upsertGuildChannelFromApi(queryClient: QueryClient, channel: GuildChannelSummary) {
  const channelsKey = guildChannelsQueryKey(channel.guildId)
  const isNew = !queryClient
    .getQueryData<GuildChannelSummary[]>(channelsKey)
    ?.some((item) => item.id === channel.id)

  queryClient.setQueryData<GuildChannelSummary[]>(channelsKey, (current = []) =>
    upsertByRevision(current, channel),
  )

  if (isNew) {
    ensureEmptyGuildChannelOverwrites(queryClient, channel.guildId, channel.id)
  }
}

export function upsertGuildChannelsFromApi(
  queryClient: QueryClient,
  guildId: string,
  channels: GuildChannelSummary[],
) {
  queryClient.setQueryData<GuildChannelSummary[]>(guildChannelsQueryKey(guildId), (current = []) =>
    channels.reduce((nextChannels, channel) => upsertByRevision(nextChannels, channel), current),
  )
}

export function removeGuildChannelFromGateway(
  queryClient: QueryClient,
  guildId: string,
  channelId: string,
) {
  queryClient.setQueryData<GuildChannelSummary[]>(guildChannelsQueryKey(guildId), (current = []) =>
    current.filter((channel) => channel.id !== channelId),
  )
  queryClient.removeQueries({ queryKey: guildChannelOverwritesQueryKey(guildId, channelId) })
}

function ensureEmptyGuildChannelOverwrites(
  queryClient: QueryClient,
  guildId: string,
  channelId: string,
) {
  const key = guildChannelOverwritesQueryKey(guildId, channelId)
  if (queryClient.getQueryData(key) === undefined) {
    queryClient.setQueryData<GuildChannelOverwriteSummary[]>(key, [])
  }
}

function shouldRefreshChannelsForOverwriteUpdate(
  cacheSeeded: boolean,
  previous: { allow: string; deny: string } | undefined,
  next: { allow: string; deny: string },
) {
  // Without a seeded overwrite list we cannot compare the previous View Channel
  // state, so refresh eagerly.
  if (!cacheSeeded) return true
  return channelOverwriteAffectsVisibleChannels(previous, next)
}

function shouldRefreshChannelsForOverwriteRemoval(
  cacheSeeded: boolean,
  previous: { allow: string; deny: string } | undefined,
) {
  if (!cacheSeeded) return true
  return previous ? channelOverwriteRemovalAffectsVisibleChannels(previous) : false
}

function shouldRefreshChannelsForRoleUpdate(
  previous: GuildRoleSummary | undefined,
  next: GuildRoleSummary,
) {
  // Creating a role alone does not change visibility until it is assigned.
  if (!previous) return false
  return rolePermissionsAffectVisibleChannels(previous.permissions, next.permissions)
}

function upsertGuildChannelOverwrite(
  queryClient: QueryClient,
  overwrite: GuildChannelOverwriteSummary,
) {
  queryClient.setQueryData<GuildChannelOverwriteSummary[]>(
    guildChannelOverwritesQueryKey(overwrite.guildId, overwrite.channelId),
    // Never synthesize a partial list when the cache was never seeded/fetched.
    (current) => (current ? upsertOverwriteByRevision(current, overwrite) : current),
  )
}

function removeGuildChannelOverwrite(
  queryClient: QueryClient,
  guildId: string,
  channelId: string,
  appliesTo: GuildChannelOverwriteSummary['appliesTo'],
  appliesToId: string,
) {
  queryClient.setQueryData<GuildChannelOverwriteSummary[]>(
    guildChannelOverwritesQueryKey(guildId, channelId),
    (current) =>
      current
        ? current.filter(
            (item) => !(item.appliesTo === appliesTo && item.appliesToId === appliesToId),
          )
        : current,
  )
}

function upsertGuild(queryClient: QueryClient, guild: GuildSummary) {
  queryClient.setQueryData<GuildSummary[]>(guildsQueryKey, (current = []) =>
    upsertByRevision(current, guild),
  )
}

function upsertOverwriteByRevision(
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

function upsertByRevision<T extends { id: string; revision: number }>(current: T[], next: T) {
  const existing = current.find((item) => item.id === next.id)
  if (existing && existing.revision > next.revision) {
    return current
  }

  if (existing) {
    return current.map((item) => (item.id === next.id ? next : item))
  }

  return [...current, next]
}

function resolveMemberRolesFromIds(roles: GuildRoleSummary[], roleIds: string[]) {
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

function patchGuildMemberRoleCaches(
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

function stripGuildMemberRoleCaches(queryClient: QueryClient, guildId: string, roleId: string) {
  queryClient.setQueriesData<GuildRoleSummary[]>(
    {
      predicate: (query) => isGuildMemberRolesQueryKey(query.queryKey, guildId),
    },
    (current) => current?.filter((role) => role.id !== roleId),
  )
}

function toGuildSummary(guild: GatewayReadyData['guilds'][number]): GuildSummary {
  return {
    createdAt: guild.created_at,
    description: guild.description,
    iconAssetId: guild.icon_asset_id,
    id: guild.id,
    name: guild.name,
    ownerId: guild.owner_id,
    revision: guild.revision,
    updatedAt: guild.updated_at,
  }
}

function toChannelSummary(channel: ReadyChannel): GuildChannelSummary {
  return {
    guildId: channel.guild_id,
    id: channel.id,
    name: channel.name,
    parentId: channel.parent_id && channel.parent_id !== '0' ? channel.parent_id : undefined,
    position: channel.position,
    revision: channel.revision,
    topic: channel.topic,
    type: channel.type,
  }
}

function toRoleSummary(role: ReadyRole): GuildRoleSummary {
  return {
    createdAt: role.created_at,
    guildId: role.guild_id,
    id: role.id,
    isDefault: role.is_default,
    name: role.name,
    permissions: role.permissions,
    position: role.position,
    revision: role.revision,
    updatedAt: role.updated_at,
  }
}

function toOverwriteSummary(overwrite: ReadyPermissionOverwrite): GuildChannelOverwriteSummary {
  return {
    allow: overwrite.allow,
    appliesTo: toOverwriteAppliesTo(overwrite.applies_to),
    appliesToId: overwrite.applies_to_id,
    channelId: overwrite.channel_id,
    createdAt: overwrite.created_at,
    deny: overwrite.deny,
    guildId: overwrite.guild_id,
    revision: overwrite.revision,
    updatedAt: overwrite.updated_at,
  }
}

function toOverwriteAppliesTo(value: number): GuildChannelOverwriteSummary['appliesTo'] {
  if (value === 1) return 'role'
  if (value === 2) return 'member'
  throw new Error('permission overwrite applies_to is invalid')
}
