import type { QueryClient } from '@tanstack/react-query'

import {
  guildsQueryKey,
  removeGuildChannelFromGateway,
  removeGuildFromGateway,
  replaceGuildsFromReady,
  upsertGuildChannelFromGateway,
  upsertGuildFromGateway,
} from '@/features/guilds/guild-queries'
import { isGatewayDispatch, type GatewayDispatch, type GatewayReadyData } from '@/gateway'

import { gatewayReadyQueryKey } from './gateway-context'

export function syncGatewayDispatch(queryClient: QueryClient, dispatch: GatewayDispatch) {
  if (isGatewayDispatch(dispatch, 'READY')) {
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
