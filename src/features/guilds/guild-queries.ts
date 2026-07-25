import {
  infiniteQueryOptions,
  queryOptions,
  skipToken,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query'

import {
  listGuildChannels,
  listGuildMemberRoles,
  listGuildMembers,
  listGuildRoles,
  type Guild,
  type GuildChannel,
  type GuildMember,
  type GuildMemberPage,
  type GuildRole,
} from '@/api/guild'
import type {
  GatewayReadyData,
  GuildChannelPayload,
  GuildDeletedPayload,
  GuildPayload,
  GuildRolePayload,
  ReadyChannel,
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
  queryClient.setQueryData<GuildRoleSummary[]>(guildRolesQueryKey(role.guildId), (current = []) =>
    upsertByRevision(current, role),
  )
}

export function upsertGuildRolesFromApi(
  queryClient: QueryClient,
  guildId: string,
  roles: GuildRoleSummary[],
) {
  queryClient.setQueryData<GuildRoleSummary[]>(guildRolesQueryKey(guildId), (current = []) =>
    roles.reduce((nextRoles, role) => upsertByRevision(nextRoles, role), current),
  )
}

export function removeGuildRoleFromApi(queryClient: QueryClient, guildId: string, roleId: string) {
  queryClient.setQueryData<GuildRoleSummary[]>(guildRolesQueryKey(guildId), (current = []) =>
    current.filter((role) => role.id !== roleId),
  )
}

export function upsertGuildRoleFromGateway(queryClient: QueryClient, role: GuildRolePayload) {
  queryClient.setQueryData<GuildRoleSummary[]>(guildRolesQueryKey(role.guild_id), (current = []) =>
    upsertByRevision(current, toRoleSummary(role)),
  )
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

export function invalidateGuildMemberRolesFromGateway(
  queryClient: QueryClient,
  guildId: string,
  userId: string,
) {
  void queryClient.invalidateQueries({ queryKey: guildMemberRolesQueryKey(guildId, userId) })
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
    queryClient.setQueryData<GuildChannelSummary[]>(
      guildChannelsQueryKey(guild.id),
      guild.channels.map(toChannelSummary),
    )
    queryClient.setQueryData<GuildRoleSummary[]>(
      guildRolesQueryKey(guild.id),
      guild.roles.map(toRoleSummary),
    )
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
  queryClient.setQueryData<GuildChannelSummary[]>(
    guildChannelsQueryKey(channel.guild_id),
    (current = []) => upsertByRevision(current, nextChannel),
  )
}

export function upsertGuildChannelFromApi(queryClient: QueryClient, channel: GuildChannelSummary) {
  queryClient.setQueryData<GuildChannelSummary[]>(
    guildChannelsQueryKey(channel.guildId),
    (current = []) => upsertByRevision(current, channel),
  )
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
}

function upsertGuild(queryClient: QueryClient, guild: GuildSummary) {
  queryClient.setQueryData<GuildSummary[]>(guildsQueryKey, (current = []) =>
    upsertByRevision(current, guild),
  )
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
