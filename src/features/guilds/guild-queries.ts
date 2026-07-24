import { queryOptions, skipToken, type QueryClient } from '@tanstack/react-query'

import { listGuildChannels, type Guild, type GuildChannel } from '@/api/guild'
import type {
  GatewayReadyData,
  GuildChannelPayload,
  GuildDeletedPayload,
  GuildPayload,
  ReadyChannel,
} from '@/gateway'

export interface GuildSummary {
  createdAt: number
  iconAssetId: string
  id: string
  name: string
  ownerId: string
  revision: number
  updatedAt: number
}

export type GuildChannelSummary = GuildChannel

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

export function guildChannelsQueryOptions(guildId: string) {
  return queryOptions({
    queryFn: () => listGuildChannels(guildId),
    queryKey: guildChannelsQueryKey(guildId),
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export function replaceGuildsFromReady(queryClient: QueryClient, ready: GatewayReadyData) {
  const previousGuildIds = queryClient
    .getQueryData<GuildSummary[]>(guildsQueryKey)
    ?.map((guild) => guild.id)

  queryClient.setQueryData<GuildSummary[]>(guildsQueryKey, ready.guilds.map(toGuildSummary))

  const nextGuildIds = new Set(ready.guilds.map((guild) => guild.id))
  for (const guildId of previousGuildIds ?? []) {
    if (!nextGuildIds.has(guildId)) {
      queryClient.removeQueries({ queryKey: guildChannelsQueryKey(guildId) })
    }
  }

  for (const guild of ready.guilds) {
    queryClient.setQueryData<GuildChannelSummary[]>(
      guildChannelsQueryKey(guild.id),
      guild.channels.map(toChannelSummary),
    )
  }
}

export function upsertGuildFromApi(queryClient: QueryClient, guild: Guild) {
  upsertGuild(queryClient, guild)
}

export function upsertGuildFromGateway(queryClient: QueryClient, guild: GuildPayload) {
  upsertGuild(queryClient, {
    createdAt: guild.created_at,
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
  queryClient.removeQueries({ queryKey: guildChannelsQueryKey(guild.id) })
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
