import type { QueryClient } from '@tanstack/react-query'

import type { DeleteGuildChannelResult, Guild, GuildChannelList } from '@/api/guild'
import type {
  GatewayReadyData,
  GuildChannelDeletedPayload,
  GuildChannelPayload,
  GuildDeletedPayload,
  GuildPayload,
} from '@/gateway'
import type {
  GuildChannelOverwriteSummary,
  GuildChannelSummary,
  GuildRoleSummary,
  GuildSummary,
} from '@/features/guilds/guild-query-types'
import {
  guildChannelLayoutRevisionQueryKey,
  guildChannelOverwritesQueryKey,
  guildChannelsQueryKey,
  guildMemberRolesQueryKey,
  guildQueryKey,
  guildRolesQueryKey,
  guildsQueryKey,
  getGuildChannelLayoutRevision,
  setGuildChannelLayoutRevision,
} from '@/features/guilds/guild-query-options'
import { invalidateGuildChannelsFromGateway } from '@/features/guilds/guild-query-invalidation'
import {
  ensureEmptyGuildChannelOverwrites,
  resolveMemberRolesFromIds,
  upsertByRevision,
} from '@/features/guilds/guild-query-helpers'
import {
  toChannelSummary,
  toGuildSummary,
  toOverwriteSummary,
  toRoleSummary,
} from '@/features/guilds/guild-query-transform'

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
    if (Number.isSafeInteger(guild.channel_layout_revision) && guild.channel_layout_revision > 0) {
      queryClient.setQueryData(
        guildChannelLayoutRevisionQueryKey(guild.id),
        guild.channel_layout_revision,
      )
    }
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
  const currentLayoutRevision = getGuildChannelLayoutRevision(queryClient, channel.guild_id)
  if (
    channel.channel_layout_revision !== undefined &&
    currentLayoutRevision !== undefined &&
    channel.channel_layout_revision < currentLayoutRevision
  ) {
    return
  }

  if (channel.channel_layout_revision !== undefined) {
    setGuildChannelLayoutRevision(queryClient, channel.guild_id, channel.channel_layout_revision)
  }

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

export function upsertGuildChannelFromApi(
  queryClient: QueryClient,
  channel: GuildChannelSummary,
  channelLayoutRevision?: number,
) {
  if (channelLayoutRevision !== undefined) {
    setGuildChannelLayoutRevision(queryClient, channel.guildId, channelLayoutRevision)
  }

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
  result: GuildChannelList | GuildChannelSummary[],
  channelLayoutRevision?: number,
) {
  const channels = Array.isArray(result) ? result : result.channels
  const revision = Array.isArray(result) ? channelLayoutRevision : result.channelLayoutRevision
  if (revision !== undefined) {
    setGuildChannelLayoutRevision(queryClient, guildId, revision)
  }

  queryClient.setQueryData<GuildChannelSummary[]>(guildChannelsQueryKey(guildId), (current = []) =>
    channels.reduce((nextChannels, channel) => upsertByRevision(nextChannels, channel), current),
  )
}

export function removeGuildChannelFromGateway(
  queryClient: QueryClient,
  deleted: GuildChannelDeletedPayload,
) {
  const {
    channel_layout_revision: channelLayoutRevision,
    guild_id: guildId,
    id: channelId,
  } = deleted
  const currentLayoutRevision = getGuildChannelLayoutRevision(queryClient, guildId)
  if (
    channelLayoutRevision !== undefined &&
    currentLayoutRevision !== undefined &&
    channelLayoutRevision < currentLayoutRevision
  ) {
    return
  }

  const channelsKey = guildChannelsQueryKey(guildId)
  const currentChannels = queryClient.getQueryData<GuildChannelSummary[]>(channelsKey)
  if (currentChannels !== undefined) {
    queryClient.setQueryData<GuildChannelSummary[]>(
      channelsKey,
      currentChannels.filter((channel) => channel.id !== channelId),
    )
  }
  queryClient.removeQueries({ queryKey: guildChannelOverwritesQueryKey(guildId, channelId) })
  if (channelLayoutRevision !== undefined) {
    setGuildChannelLayoutRevision(queryClient, guildId, channelLayoutRevision)
  }
  if (currentChannels === undefined || channelLayoutRevision === undefined) {
    invalidateGuildChannelsFromGateway(queryClient, guildId)
  }
}

export function removeGuildChannelFromApi(
  queryClient: QueryClient,
  guildId: string,
  channelId: string,
  result: DeleteGuildChannelResult,
) {
  setGuildChannelLayoutRevision(queryClient, guildId, result.channelLayoutRevision)
  queryClient.setQueryData<GuildChannelSummary[]>(guildChannelsQueryKey(guildId), (current = []) =>
    current.filter((channel) => channel.id !== channelId),
  )
  queryClient.removeQueries({ queryKey: guildChannelOverwritesQueryKey(guildId, channelId) })
}

function upsertGuild(queryClient: QueryClient, guild: GuildSummary) {
  queryClient.setQueryData<GuildSummary[]>(guildsQueryKey, (current = []) =>
    upsertByRevision(current, guild),
  )
}
