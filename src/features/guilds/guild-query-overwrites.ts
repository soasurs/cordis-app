import type { QueryClient } from '@tanstack/react-query'

import type { GuildChannelOverwriteDeletedPayload, GuildChannelOverwritePayload } from '@/gateway'
import { guildChannelOverwritesQueryKey } from '@/features/guilds/guild-query-options'
import type { GuildChannelOverwriteSummary } from '@/features/guilds/guild-query-types'
import { invalidateGuildChannelsFromGateway } from '@/features/guilds/guild-query-invalidation'
import {
  shouldRefreshChannelsForOverwriteRemoval,
  shouldRefreshChannelsForOverwriteUpdate,
  upsertOverwriteByRevision,
} from '@/features/guilds/guild-query-helpers'
import { toOverwriteAppliesTo } from '@/features/guilds/guild-query-transform'

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
