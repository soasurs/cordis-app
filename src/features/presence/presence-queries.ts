import {
  queryOptions,
  skipToken,
  useQueries,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'

import {
  resolveUsersPresence,
  type PresenceResolution,
  type UserPresence,
  type UserPresenceStatus,
} from '@/api/presence'
import type { PresenceUpdatedPayload, ReadyPresence } from '@/gateway'

export type PresenceCache = ReadonlyMap<string, UserPresence>

export const presenceQueryKey = ['presence'] as const

export const presenceQueryOptions = queryOptions({
  initialData: new Map<string, UserPresence>() as PresenceCache,
  queryFn: skipToken,
  queryKey: presenceQueryKey,
  staleTime: Number.POSITIVE_INFINITY,
})

export function useUserPresence(userId: string): UserPresence | undefined {
  return useQuery({
    ...presenceQueryOptions,
    select: (presences) => presences.get(userId),
  }).data
}

export function useResolvePresenceBatches(userIdBatches: string[][]): void {
  const queryClient = useQueryClient()
  const normalizedBatches = useMemo(
    () =>
      userIdBatches
        .map((userIds) => [...new Set(userIds)].sort(compareIdentifier))
        .filter((userIds) => userIds.length > 0),
    [userIdBatches],
  )
  const resolutions = useQueries({
    queries: normalizedBatches.map((userIds) => ({
      queryFn: () => resolveUsersPresence(userIds),
      queryKey: [...presenceQueryKey, 'resolve', ...userIds] as const,
      staleTime: 30_000,
    })),
  })

  useEffect(() => {
    for (const resolution of resolutions) {
      if (resolution.data) {
        reconcilePresenceResolution(queryClient, resolution.data)
      }
    }
  }, [queryClient, resolutions])
}

export function replacePresencesFromReady(
  queryClient: QueryClient,
  presences: ReadyPresence[],
): void {
  const next = new Map<string, UserPresence>()
  for (const presence of presences) {
    applyPresenceToMap(next, {
      lastSeenAt: presence.last_seen_at,
      status: toPresenceStatus(presence.status),
      userId: presence.user_id,
      version: parsePresenceVersion(presence.version),
    })
  }
  queryClient.setQueryData(presenceQueryKey, next)
}

export function applyPresenceFromGateway(
  queryClient: QueryClient,
  presence: PresenceUpdatedPayload,
): void {
  applyPresence(queryClient, {
    lastSeenAt: presence.changed_at,
    status: toPresenceStatus(presence.status),
    userId: presence.user_id,
    version: parsePresenceVersion(presence.version),
  })
}

export function reconcilePresenceResolution(
  queryClient: QueryClient,
  resolution: PresenceResolution,
): void {
  queryClient.setQueryData<PresenceCache>(presenceQueryKey, (current) => {
    const next = new Map(current ?? [])
    let changed = false
    const returnedUserIds = new Set(resolution.presences.map((presence) => presence.userId))
    for (const userId of resolution.requestedUserIds) {
      if (!returnedUserIds.has(userId)) {
        changed = next.delete(userId) || changed
      }
    }
    for (const presence of resolution.presences) {
      changed = applyPresenceToMap(next, presence) || changed
    }
    return changed ? next : current
  })
}

export function clearPresences(queryClient: QueryClient): void {
  queryClient.removeQueries({ queryKey: presenceQueryKey })
}

function applyPresence(queryClient: QueryClient, presence: UserPresence): void {
  queryClient.setQueryData<PresenceCache>(presenceQueryKey, (current) => {
    const next = new Map(current ?? [])
    return applyPresenceToMap(next, presence) ? next : current
  })
}

function applyPresenceToMap(presences: Map<string, UserPresence>, incoming: UserPresence): boolean {
  const current = presences.get(incoming.userId)
  if (!current || incoming.version > current.version) {
    presences.set(incoming.userId, incoming)
    return true
  }
  return false
}

function parsePresenceVersion(version: string): bigint {
  if (!/^[1-9]\d*$/.test(version)) {
    throw new Error('presence version is invalid')
  }
  return BigInt(version)
}

function toPresenceStatus(status: number): UserPresenceStatus {
  switch (status) {
    case 1:
      return 'offline'
    case 2:
      return 'online'
    case 3:
      return 'idle'
    case 4:
      return 'dnd'
    default:
      throw new Error('presence status is invalid')
  }
}

function compareIdentifier(left: string, right: string): number {
  const leftValue = BigInt(left)
  const rightValue = BigInt(right)
  return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0
}
