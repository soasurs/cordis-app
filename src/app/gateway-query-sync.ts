import type { QueryClient } from '@tanstack/react-query'

import {
  guildsQueryKey,
  invalidateGuildChannelOverwritesFromGateway,
  invalidateGuildChannelsFromGateway,
  invalidateGuildMembersFromGateway,
  removeGuildChannelFromGateway,
  removeGuildFromGateway,
  removeGuildRoleFromGateway,
  replaceGuildMemberRolesFromGateway,
  replaceGuildsFromReady,
  upsertGuildChannelFromGateway,
  upsertGuildFromGateway,
  upsertGuildRoleFromGateway,
} from '@/features/guilds/guild-queries'
import { isGatewayDispatch, type GatewayDispatch, type GatewayReadyData } from '@/gateway'

import { gatewayReadyQueryKey } from '@/app/gateway-context'

export function syncGatewayDispatch(queryClient: QueryClient, dispatch: GatewayDispatch) {
  if (isGatewayDispatch(dispatch, 'ready')) {
    queryClient.setQueryData<GatewayReadyData>(gatewayReadyQueryKey, dispatch.data)
    replaceGuildsFromReady(queryClient, dispatch.data)
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
    invalidateGuildChannelsFromGateway(queryClient, dispatch.data.guild_id)
    return
  }

  if (isGatewayDispatch(dispatch, 'guild.role.deleted')) {
    removeGuildRoleFromGateway(queryClient, dispatch.data.guild_id, dispatch.data.id)
    invalidateGuildChannelsFromGateway(queryClient, dispatch.data.guild_id)
    return
  }

  if (
    isGatewayDispatch(dispatch, 'guild.channel.overwrite.updated') ||
    isGatewayDispatch(dispatch, 'guild.channel.overwrite.deleted')
  ) {
    invalidateGuildChannelsFromGateway(queryClient, dispatch.data.guild_id)
    invalidateGuildChannelOverwritesFromGateway(
      queryClient,
      dispatch.data.guild_id,
      dispatch.data.channel_id,
    )
    return
  }

  if (isGatewayDispatch(dispatch, 'session.reconcile')) {
    invalidateGuildChannelsFromGateway(queryClient, dispatch.data.guild_id)
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
  }
}

export function clearGatewayQueries(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: gatewayReadyQueryKey })
  queryClient.removeQueries({ queryKey: guildsQueryKey })
}
