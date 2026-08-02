import type { QueryClient } from '@tanstack/react-query'

import {
  guildChannelOverwritesQueryKey,
  guildChannelsQueryKey,
  guildMemberRolesQueryKey,
  guildMembersQueryKey,
} from '@/features/guilds/guild-query-options'

export function invalidateGuildMembersFromGateway(queryClient: QueryClient, guildId: string) {
  void queryClient.invalidateQueries({ queryKey: guildMembersQueryKey(guildId) })
}

/** Re-pull visible channels after View Channel / Administrator access may have changed. */
export function invalidateGuildChannelsFromGateway(queryClient: QueryClient, guildId: string) {
  void queryClient.invalidateQueries({
    // Overwrites keys are nested under this prefix; exact keeps them untouched.
    exact: true,
    queryKey: guildChannelsQueryKey(guildId),
    // Permission changes must refresh even if the guild page query is inactive.
    refetchType: 'all',
  })
}

export function invalidateGuildChannelOverwritesFromGateway(
  queryClient: QueryClient,
  guildId: string,
  channelId: string,
) {
  void queryClient.invalidateQueries({
    queryKey: guildChannelOverwritesQueryKey(guildId, channelId),
  })
}

export function invalidateGuildMemberRolesFromGateway(
  queryClient: QueryClient,
  guildId: string,
  userId: string,
) {
  void queryClient.invalidateQueries({ queryKey: guildMemberRolesQueryKey(guildId, userId) })
}
