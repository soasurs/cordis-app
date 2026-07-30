import type { QueryClient } from '@tanstack/react-query'

import {
  guildsQueryKey,
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
} from '@/features/guilds/guild-queries'
import {
  clearChannelMessageQueries,
  patchChannelMessageFromGateway,
  removeChannelMessageFromGateway,
  upsertChannelMessageFromGateway,
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
import { isGatewayDispatch, type GatewayDispatch, type GatewayReadyData } from '@/gateway'

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
    removeGuildChannelFromGateway(queryClient, dispatch.data.guild_id, dispatch.data.id)
    return
  }

  if (isGatewayDispatch(dispatch, 'message.created')) {
    upsertChannelMessageFromGateway(queryClient, dispatch.data)
    bumpChannelLastMessageId(queryClient, dispatch.data.channel_id, dispatch.data.id)
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

  if (isGatewayDispatch(dispatch, 'presence.updated')) {
    applyPresenceFromGateway(queryClient, dispatch.data)
    return
  }

  if (isGatewayDispatch(dispatch, 'presence.preference.updated')) {
    applyPresencePreferenceFromGateway(queryClient, dispatch.data)
  }
}

export function clearGatewayQueries(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: gatewayReadyQueryKey })
  queryClient.removeQueries({ queryKey: guildsQueryKey })
  clearChannelMessageQueries(queryClient)
  clearChannelReadStateQueries(queryClient)
  clearPresences(queryClient)
  clearPresencePreferences(queryClient)
}
