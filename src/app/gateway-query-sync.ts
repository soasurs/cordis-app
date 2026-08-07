import type { QueryClient } from '@tanstack/react-query'

import {
  clearRelationshipQueries,
  patchRelationshipProfileFromGateway,
  refreshRelationshipsFromReady,
  removeRelationshipFromGateway,
  upsertRelationshipFromGateway,
} from '@/features/friends/relationship-queries'
import {
  clearDmChannelQueries,
  patchDmChannelRecipientFromGateway,
  replaceDmChannelsFromReady,
  upsertDmChannelFromGateway,
} from '@/features/dm/dm-queries'
import {
  guildsQueryKey,
  guildMemberRolesQueryKey,
  invalidateGuildChannelOverwritesFromGateway,
  invalidateGuildChannelsFromGateway,
  invalidateGuildMembersFromGateway,
  removeGuildChannelFromGateway,
  removeGuildChannelOverwriteFromGateway,
  removeGuildFromGateway,
  removeGuildRoleFromGateway,
  replaceGuildMemberRolesFromGateway,
  replaceGuildsFromReady,
  upsertGuildChannelFromGateway,
  upsertGuildChannelOverwriteFromGateway,
  upsertGuildFromGateway,
  upsertGuildRoleFromGateway,
  type GuildRoleSummary,
} from '@/features/guilds/guild-queries'
import {
  clearChannelMessageQueries,
  findChannelMessageInCache,
  patchChannelMessageFromGateway,
  referencedMessageQueryKey,
  removeChannelMessageFromGateway,
  upsertChannelMessageFromGateway,
  type ChannelMessageSummary,
} from '@/features/messages/message-queries'
import {
  bumpChannelLastMessageId,
  clearChannelReadStateQueries,
  replaceChannelReadStatesFromReady,
  setChannelLastMessageId,
  upsertChannelReadStateFromGateway,
} from '@/features/messages/read-state-queries'
import {
  applyPresenceFromGateway,
  clearPresences,
  replacePresencesFromReady,
} from '@/features/presence/presence-queries'
import {
  applyPresencePreferenceFromGateway,
  clearPresencePreferences,
  replacePresencePreferenceFromReady,
} from '@/features/presence/presence-preference-queries'
import { patchUserProfileFromGateway } from '@/features/users/user-queries'
import {
  isGatewayDispatch,
  type GatewayDispatch,
  type GatewayReadyData,
  type MessagePayload,
} from '@/gateway'

import { gatewayReadyQueryKey } from '@/app/gateway-context'

export function syncGatewayDispatch(queryClient: QueryClient, dispatch: GatewayDispatch) {
  if (isGatewayDispatch(dispatch, 'ready')) {
    queryClient.setQueryData<GatewayReadyData>(gatewayReadyQueryKey, dispatch.data)
    replaceGuildsFromReady(queryClient, dispatch.data)
    replaceChannelReadStatesFromReady(queryClient, dispatch.data.read_states)
    replacePresencesFromReady(queryClient, dispatch.data.presences ?? [])
    replacePresencePreferenceFromReady(
      queryClient,
      dispatch.data.user_id,
      dispatch.data.presence_preference,
    )
    replaceDmChannelsFromReady(queryClient, dispatch.data.dm_channels ?? [])
    refreshRelationshipsFromReady(queryClient)
    return
  }

  if (isGatewayDispatch(dispatch, 'dm.channel.created')) {
    upsertDmChannelFromGateway(queryClient, dispatch.data)
    return
  }

  if (isGatewayDispatch(dispatch, 'guild.created')) {
    upsertGuildFromGateway(queryClient, dispatch.data)
    return
  }

  if (isGatewayDispatch(dispatch, 'guild.updated')) {
    upsertGuildFromGateway(queryClient, dispatch.data)
    return
  }

  if (isGatewayDispatch(dispatch, 'guild.deleted')) {
    removeGuildFromGateway(queryClient, dispatch.data)
    return
  }

  if (
    isGatewayDispatch(dispatch, 'guild.member.joined') ||
    isGatewayDispatch(dispatch, 'guild.member.updated') ||
    isGatewayDispatch(dispatch, 'guild.member.removed')
  ) {
    invalidateGuildMembersFromGateway(queryClient, dispatch.data.guild_id)
    return
  }

  if (isGatewayDispatch(dispatch, 'guild.member.roles.updated')) {
    replaceGuildMemberRolesFromGateway(
      queryClient,
      dispatch.data.guild_id,
      dispatch.data.user_id,
      dispatch.data.role_ids,
    )
    invalidateGuildChannelsFromGateway(queryClient, dispatch.data.guild_id)
    return
  }

  if (
    isGatewayDispatch(dispatch, 'guild.role.created') ||
    isGatewayDispatch(dispatch, 'guild.role.updated')
  ) {
    upsertGuildRoleFromGateway(queryClient, dispatch.data)
    return
  }

  if (isGatewayDispatch(dispatch, 'guild.role.deleted')) {
    removeGuildRoleFromGateway(queryClient, dispatch.data.guild_id, dispatch.data.id)
    return
  }

  if (isGatewayDispatch(dispatch, 'guild.channel.overwrite.updated')) {
    upsertGuildChannelOverwriteFromGateway(queryClient, dispatch.data)
    return
  }

  if (isGatewayDispatch(dispatch, 'guild.channel.overwrite.deleted')) {
    removeGuildChannelOverwriteFromGateway(queryClient, dispatch.data)
    return
  }

  if (isGatewayDispatch(dispatch, 'session.reconcile')) {
    invalidateGuildChannelsFromGateway(queryClient, dispatch.data.guild_id)
    invalidateGuildChannelOverwritesFromGateway(
      queryClient,
      dispatch.data.guild_id,
      dispatch.data.channel_id,
    )
    return
  }

  if (
    isGatewayDispatch(dispatch, 'guild.channel.created') ||
    isGatewayDispatch(dispatch, 'guild.channel.updated')
  ) {
    upsertGuildChannelFromGateway(queryClient, dispatch.data)
    return
  }

  if (isGatewayDispatch(dispatch, 'guild.channel.deleted')) {
    removeGuildChannelFromGateway(queryClient, dispatch.data)
    return
  }

  if (isGatewayDispatch(dispatch, 'message.created')) {
    upsertChannelMessageFromGateway(queryClient, dispatch.data)
    const ready = queryClient.getQueryData<GatewayReadyData>(gatewayReadyQueryKey)
    bumpChannelLastMessageId(
      queryClient,
      dispatch.data.channel_id,
      dispatch.data.id,
      messageNotifiesCurrentUser(queryClient, dispatch.data, ready),
    )
    return
  }

  if (isGatewayDispatch(dispatch, 'message.updated')) {
    patchChannelMessageFromGateway(queryClient, dispatch.data)
    return
  }

  if (isGatewayDispatch(dispatch, 'message.deleted')) {
    removeChannelMessageFromGateway(queryClient, dispatch.data)
    setChannelLastMessageId(queryClient, dispatch.data.channel_id, dispatch.data.last_message_id)
    return
  }

  if (isGatewayDispatch(dispatch, 'message.read.updated')) {
    upsertChannelReadStateFromGateway(queryClient, dispatch.data)
    return
  }

  if (isGatewayDispatch(dispatch, 'relationship.updated')) {
    upsertRelationshipFromGateway(queryClient, dispatch.data)
    return
  }

  if (isGatewayDispatch(dispatch, 'relationship.removed')) {
    removeRelationshipFromGateway(queryClient, dispatch.data)
    return
  }

  if (isGatewayDispatch(dispatch, 'user.profile.updated')) {
    patchRelationshipProfileFromGateway(queryClient, dispatch.data)
    patchDmChannelRecipientFromGateway(queryClient, dispatch.data)
    patchUserProfileFromGateway(queryClient, dispatch.data)
    return
  }

  if (isGatewayDispatch(dispatch, 'presence.updated')) {
    applyPresenceFromGateway(queryClient, dispatch.data)
    return
  }

  if (isGatewayDispatch(dispatch, 'presence.preference.updated')) {
    applyPresencePreferenceFromGateway(queryClient, dispatch.data)
  }
}

function messageNotifiesCurrentUser(
  queryClient: QueryClient,
  message: MessagePayload,
  ready: GatewayReadyData | undefined,
) {
  if (!ready) return false
  if (message.referenced_message_id) {
    const referenced =
      findChannelMessageInCache(
        queryClient,
        message.referenced_channel_id ?? message.channel_id,
        message.referenced_message_id,
      ) ??
      queryClient.getQueryData<ChannelMessageSummary>(
        referencedMessageQueryKey(message.referenced_message_id),
      )
    if (referenced?.author?.userId === ready.user_id) return true
  }
  if (message.mention_user_ids?.includes(ready.user_id)) return true
  if (message.mention_everyone) return true

  if (!message.guild_id || !message.mention_role_ids?.length) return false
  const guild = ready.guilds.find(
    (item) =>
      item.id === message.guild_id ||
      item.channels.some((channel) => channel.id === message.channel_id),
  )
  if (!guild) return false

  const cachedMemberRoles = queryClient.getQueryData<GuildRoleSummary[]>(
    guildMemberRolesQueryKey(guild.id, ready.user_id),
  )
  const memberRoleIds = new Set([
    ...guild.member_role_ids,
    ...(cachedMemberRoles?.map((role) => role.id) ?? []),
  ])
  return message.mention_role_ids.some((roleId) => memberRoleIds.has(roleId))
}

export function clearGatewayQueries(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: gatewayReadyQueryKey })
  queryClient.removeQueries({ queryKey: guildsQueryKey })
  clearChannelMessageQueries(queryClient)
  clearChannelReadStateQueries(queryClient)
  clearPresences(queryClient)
  clearPresencePreferences(queryClient)
  clearRelationshipQueries(queryClient)
  clearDmChannelQueries(queryClient)
}
