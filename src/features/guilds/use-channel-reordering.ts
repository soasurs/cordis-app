import { useMutation, useQueryClient } from '@tanstack/react-query'

import { isResourceConflictError } from '@/api/errors'
import { reorderGuildChannels, type GuildChannelList } from '@/api/guild'

import { getChangedChannelPositions } from '@/features/guilds/channel-ordering'
import {
  getGuildChannelLayoutRevision,
  guildChannelsQueryKey,
  setGuildChannelLayoutRevision,
  type GuildChannelSummary,
  upsertGuildChannelsFromApi,
} from '@/features/guilds/guild-queries'

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
    GuildChannelList,
    Error,
    ReorderGuildChannelVariables,
    ReorderGuildChannelContext
  >({
    retry: false,
    mutationFn: async ({ nextChannels, previousChannels }) => {
      const changedPositions = getChangedChannelPositions(previousChannels, nextChannels)
      const expectedChannelLayoutRevision = getGuildChannelLayoutRevision(queryClient, guildId)
      if (expectedChannelLayoutRevision === undefined) {
        throw new Error('channel layout revision is unavailable')
      }
      if (changedPositions.length === 0) {
        return {
          channelLayoutRevision: expectedChannelLayoutRevision,
          channels: [],
        }
      }
      return reorderGuildChannels(guildId, changedPositions, expectedChannelLayoutRevision)
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
      void queryClient.invalidateQueries({
        exact: true,
        queryKey: guildChannelsQueryKey(guildId),
        refetchType: isResourceConflictError(_error) ? 'all' : 'active',
      })
    },
    onSuccess: (result) => {
      if (result.channels.length > 0) {
        upsertGuildChannelsFromApi(queryClient, guildId, result)
      } else {
        setGuildChannelLayoutRevision(queryClient, guildId, result.channelLayoutRevision)
      }
    },
  })
}
