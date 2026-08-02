import { queryOptions, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'

import {
  getReadStatesForDm,
  getReadStatesForGuild,
  type ChannelReadStateSummary,
} from '@/api/message'
import type { MessageReadUpdatedPayload } from '@/gateway/protocol/payloads/message'
import type { ReadyReadState } from '@/gateway/protocol/payloads/ready'

export type ChannelReadStatesMap = Record<string, ChannelReadStateSummary>

export function channelReadStatesQueryKey() {
  return ['read-states'] as const
}

export function useChannelReadStates() {
  const queryClient = useQueryClient()
  return useQuery({
    queryFn: () =>
      queryClient.getQueryData<ChannelReadStatesMap>(channelReadStatesQueryKey()) ?? {},
    queryKey: channelReadStatesQueryKey(),
    staleTime: Infinity,
  })
}

export function guildReadStatesQueryOptions(guildId: string) {
  return queryOptions({
    queryFn: () => getReadStatesForGuild(guildId),
    queryKey: ['read-states', 'guild', guildId] as const,
    staleTime: 30_000,
  })
}

export function dmReadStatesQueryOptions() {
  return queryOptions({
    queryFn: () => getReadStatesForDm(),
    queryKey: ['read-states', 'dm'] as const,
    staleTime: 30_000,
  })
}

export function getChannelReadStates(queryClient: QueryClient): ChannelReadStatesMap {
  return queryClient.getQueryData<ChannelReadStatesMap>(channelReadStatesQueryKey()) ?? {}
}

export function replaceChannelReadStates(
  queryClient: QueryClient,
  states: ChannelReadStateSummary[],
) {
  const next: ChannelReadStatesMap = {}
  for (const state of states) {
    next[state.channelId] = state
  }
  queryClient.setQueryData(channelReadStatesQueryKey(), next)
}

export function mergeChannelReadStates(
  queryClient: QueryClient,
  states: ChannelReadStateSummary[],
) {
  queryClient.setQueryData<ChannelReadStatesMap>(channelReadStatesQueryKey(), (current = {}) => {
    const next = { ...current }
    for (const state of states) {
      next[state.channelId] = mergeChannelReadState(next[state.channelId], state)
    }
    return next
  })
}

export function upsertChannelReadState(queryClient: QueryClient, state: ChannelReadStateSummary) {
  queryClient.setQueryData<ChannelReadStatesMap>(channelReadStatesQueryKey(), (current = {}) => ({
    ...current,
    [state.channelId]: state,
  }))
}

export function bumpChannelLastMessageId(
  queryClient: QueryClient,
  channelId: string,
  messageId: string,
  isMention = false,
) {
  queryClient.setQueryData<ChannelReadStatesMap>(channelReadStatesQueryKey(), (current = {}) => {
    const existing = current[channelId]
    if (existing && compareSnowflakeId(messageId, existing.lastMessageId) <= 0) {
      return current
    }
    return {
      ...current,
      [channelId]: {
        channelId,
        lastMessageId: messageId,
        lastReadMessageId: existing?.lastReadMessageId ?? '0',
        mentionCount: (existing?.mentionCount ?? 0) + (isMention ? 1 : 0),
      },
    }
  })
}

export function setChannelLastMessageId(
  queryClient: QueryClient,
  channelId: string,
  lastMessageId: string,
) {
  queryClient.setQueryData<ChannelReadStatesMap>(channelReadStatesQueryKey(), (current = {}) => {
    const existing = current[channelId]
    return {
      ...current,
      [channelId]: {
        channelId,
        lastMessageId,
        lastReadMessageId: existing?.lastReadMessageId ?? '0',
        mentionCount: existing?.mentionCount ?? 0,
      },
    }
  })
}

export function replaceChannelReadStatesFromReady(
  queryClient: QueryClient,
  states: ReadyReadState[],
) {
  replaceChannelReadStates(
    queryClient,
    states.map((state) => ({
      channelId: state.channel_id,
      lastMessageId: state.last_message_id,
      lastReadMessageId: state.last_read_message_id,
      mentionCount: state.mention_count,
    })),
  )
}

export function upsertChannelReadStateFromGateway(
  queryClient: QueryClient,
  payload: MessageReadUpdatedPayload,
) {
  queryClient.setQueryData<ChannelReadStatesMap>(channelReadStatesQueryKey(), (current = {}) => {
    const channelId = payload.channel_id
    const nextState = mergeChannelReadState(current[channelId], {
      channelId,
      lastMessageId: payload.last_message_id,
      lastReadMessageId: payload.last_read_message_id,
      mentionCount: payload.mention_count,
    })
    if (current[channelId] === nextState) {
      return current
    }
    return {
      ...current,
      [channelId]: nextState,
    }
  })
}

function mergeChannelReadState(
  existing: ChannelReadStateSummary | undefined,
  incoming: ChannelReadStateSummary,
) {
  if (!existing) return incoming

  const lastMessageId =
    compareSnowflakeId(incoming.lastMessageId, existing.lastMessageId) > 0
      ? incoming.lastMessageId
      : existing.lastMessageId
  const lastReadMessageId =
    compareSnowflakeId(incoming.lastReadMessageId, existing.lastReadMessageId) > 0
      ? incoming.lastReadMessageId
      : existing.lastReadMessageId
  // Role/everyone mentions are expanded asynchronously on the server. Until the
  // read cursor advances, a lower server count must not erase the local event bump.
  const mentionCount =
    compareSnowflakeId(incoming.lastReadMessageId, existing.lastReadMessageId) > 0
      ? incoming.mentionCount
      : Math.max(existing.mentionCount, incoming.mentionCount)

  if (
    existing.lastMessageId === lastMessageId &&
    existing.lastReadMessageId === lastReadMessageId &&
    existing.mentionCount === mentionCount
  ) {
    return existing
  }

  return {
    ...incoming,
    lastMessageId,
    lastReadMessageId,
    mentionCount,
  }
}

/** Advance last-read (and head if needed) through messageId without lowering either cursor. */
export function markChannelReadThrough(
  queryClient: QueryClient,
  channelId: string,
  messageId: string,
) {
  queryClient.setQueryData<ChannelReadStatesMap>(channelReadStatesQueryKey(), (current = {}) => {
    const existing = current[channelId]
    const lastMessageId =
      existing && compareSnowflakeId(existing.lastMessageId, messageId) > 0
        ? existing.lastMessageId
        : messageId
    const lastReadMessageId =
      existing && compareSnowflakeId(existing.lastReadMessageId, messageId) > 0
        ? existing.lastReadMessageId
        : messageId
    if (
      existing &&
      existing.lastMessageId === lastMessageId &&
      existing.lastReadMessageId === lastReadMessageId
    ) {
      return current
    }
    return {
      ...current,
      [channelId]: {
        channelId,
        lastMessageId,
        lastReadMessageId,
        mentionCount: 0,
      },
    }
  })
}

export function clearChannelReadStateQueries(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: channelReadStatesQueryKey() })
}

/** Negative when a < b, zero when equal, positive when a > b. */
export function compareSnowflakeId(left: string, right: string) {
  const leftValue = BigInt(left || '0')
  const rightValue = BigInt(right || '0')
  if (leftValue === rightValue) return 0
  return leftValue < rightValue ? -1 : 1
}

export function isChannelUnread(state: ChannelReadStateSummary | undefined) {
  if (!state) return false
  return compareSnowflakeId(state.lastMessageId, state.lastReadMessageId) > 0
}

export function getMentionCount(state: ChannelReadStateSummary | undefined) {
  return state?.mentionCount ?? 0
}
