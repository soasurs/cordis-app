import { queryOptions, skipToken, useQuery, type QueryClient } from '@tanstack/react-query'

import {
  isGatewayPresenceStatus,
  readPresenceStatus,
} from '@/features/presence/presence-preference'
import type {
  GatewayPresenceStatus,
  PresencePreferenceUpdatedPayload,
  ReadyPresencePreference,
} from '@/gateway'

export interface UserPresencePreference {
  pendingStatus?: GatewayPresenceStatus
  status: GatewayPresenceStatus
  version: bigint
}

const presencePreferenceQueryKeyPrefix = ['gateway', 'presence-preference'] as const

export function presencePreferenceQueryKey(userId?: string) {
  return [...presencePreferenceQueryKeyPrefix, userId ?? 'anonymous'] as const
}

export function presencePreferenceQueryOptions(userId?: string) {
  return queryOptions({
    initialData: {
      status: readPresenceStatus(userId),
      version: 0n,
    } satisfies UserPresencePreference,
    queryFn: skipToken,
    queryKey: presencePreferenceQueryKey(userId),
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export function usePresencePreference(userId?: string): UserPresencePreference {
  return (
    useQuery(presencePreferenceQueryOptions(userId)).data ?? {
      status: readPresenceStatus(userId),
      version: 0n,
    }
  )
}

export function setPresencePreferenceStatus(
  queryClient: QueryClient,
  userId: string | undefined,
  status: GatewayPresenceStatus,
): void {
  queryClient.setQueryData<UserPresencePreference>(
    presencePreferenceQueryKey(userId),
    (current) => ({
      pendingStatus: status,
      status: current?.status ?? status,
      version: current?.version ?? 0n,
    }),
  )
}

export function replacePresencePreferenceFromReady(
  queryClient: QueryClient,
  userId: string,
  preference: ReadyPresencePreference,
): void {
  const incoming = toPresencePreference(preference)
  queryClient.setQueryData<UserPresencePreference>(presencePreferenceQueryKey(userId), (current) =>
    preservePendingStatus(incoming, current?.pendingStatus),
  )
}

export function applyPresencePreferenceFromGateway(
  queryClient: QueryClient,
  preference: PresencePreferenceUpdatedPayload,
): void {
  const incoming = toPresencePreference(preference)
  queryClient.setQueryData<UserPresencePreference>(
    presencePreferenceQueryKey(preference.user_id),
    (current) =>
      !current || incoming.version > current.version
        ? preservePendingStatus(incoming, current?.pendingStatus)
        : current,
  )
}

export function clearPresencePreferences(queryClient: QueryClient): void {
  queryClient.removeQueries({ queryKey: presencePreferenceQueryKeyPrefix })
}

function toPresencePreference(preference: {
  status: unknown
  version: string
}): UserPresencePreference {
  if (!isGatewayPresenceStatus(preference.status)) {
    throw new Error('presence preference status is invalid')
  }
  if (!/^[1-9]\d*$/.test(preference.version)) {
    throw new Error('presence preference version is invalid')
  }
  return {
    status: preference.status,
    version: BigInt(preference.version),
  }
}

function preservePendingStatus(
  preference: UserPresencePreference,
  pendingStatus: GatewayPresenceStatus | undefined,
): UserPresencePreference {
  if (!pendingStatus || pendingStatus === preference.status) {
    return preference
  }
  return { ...preference, pendingStatus }
}
