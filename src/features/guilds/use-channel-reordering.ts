import { useMutation, useQueryClient } from '@tanstack/react-query'

import { reorderGuildChannels, type GuildChannel } from '@/api/guild'

import { getChangedChannelPositions } from './channel-ordering'
import {
  guildChannelsQueryKey,
  type GuildChannelSummary,
  upsertGuildChannelsFromApi,
} from './guild-queries'

interface ReorderGuildChannelVariables {
  nextChannels: GuildChannelSummary[]
  previousChannels: GuildChannelSummary[]
}

interface ReorderGuildChannelContext {
  previousChannels: GuildChannelSummary[]
}

export function useChannelReordering(guildId: string) {
  const queryClient = useQueryClient()

  return useMutation<
    GuildChannel[],
    Error,
    ReorderGuildChannelVariables,
    ReorderGuildChannelContext
  >({
    mutationFn: async ({ nextChannels, previousChannels }) => {
      const changedPositions = getChangedChannelPositions(previousChannels, nextChannels)
      if (changedPositions.length === 0) return []
      return reorderGuildChannels(guildId, changedPositions)
    },
    onMutate: async ({ nextChannels, previousChannels }) => {
      await queryClient.cancelQueries({ queryKey: guildChannelsQueryKey(guildId) })
      const cachedChannels =
        queryClient.getQueryData<GuildChannelSummary[]>(guildChannelsQueryKey(guildId)) ??
        previousChannels
      queryClient.setQueryData(guildChannelsQueryKey(guildId), nextChannels)
      return { previousChannels: cachedChannels }
    },
    onError: (_error, _variables, context) => {
      if (context) {
        queryClient.setQueryData(guildChannelsQueryKey(guildId), context.previousChannels)
      }
      void queryClient.invalidateQueries({ queryKey: guildChannelsQueryKey(guildId) })
    },
    onSuccess: (channels) => {
      upsertGuildChannelsFromApi(queryClient, guildId, channels)
    },
  })
}
