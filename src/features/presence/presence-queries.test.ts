import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import {
  applyPresenceFromGateway,
  createPresenceUserIdBatches,
  presenceQueryKey,
  presenceResolutionQueryKey,
  reconcilePresenceResolution,
  replacePresencesFromReady,
  snapshotPresenceVersions,
  type PresenceCache,
} from '@/features/presence/presence-queries'

describe('presence query cache', () => {
  it('hydrates READY and only applies strictly newer gateway versions', () => {
    const queryClient = new QueryClient()
    replacePresencesFromReady(queryClient, [
      {
        last_seen_at: 1_000,
        status: 2,
        user_id: '7',
        version: '123456789012345678',
      },
    ])

    applyPresenceFromGateway(queryClient, {
      changed_at: 2_000,
      guild_ids: ['42'],
      status: 3,
      user_id: '7',
      version: '123456789012345678',
    })
    expect(getPresence(queryClient, '7')).toMatchObject({
      lastSeenAt: 1_000,
      status: 'online',
    })

    applyPresenceFromGateway(queryClient, {
      changed_at: 3_000,
      guild_ids: ['42'],
      status: 4,
      user_id: '7',
      version: '123456789012345679',
    })
    expect(getPresence(queryClient, '7')).toEqual({
      lastSeenAt: 3_000,
      status: 'dnd',
      userId: '7',
      version: 123_456_789_012_345_679n,
    })
  })

  it('deletes omitted users without treating them as offline', () => {
    const queryClient = new QueryClient()
    replacePresencesFromReady(queryClient, [
      { last_seen_at: 1_000, status: 2, user_id: '7', version: '10' },
      { last_seen_at: 1_000, status: 3, user_id: '8', version: '10' },
    ])
    const observedVersions = snapshotPresenceVersions(queryClient, ['7', '8'])

    reconcilePresenceResolution(
      queryClient,
      {
        presences: [{ lastSeenAt: 2_000, status: 'online', userId: '7', version: 11n }],
        requestedUserIds: ['7', '8'],
      },
      observedVersions,
    )

    expect(getPresence(queryClient, '7')?.version).toBe(11n)
    expect(getPresence(queryClient, '8')).toBeUndefined()
  })

  it('does not let an older API response overwrite a realtime event', () => {
    const queryClient = new QueryClient()
    replacePresencesFromReady(queryClient, [
      { last_seen_at: 1_000, status: 2, user_id: '7', version: '10' },
    ])
    const observedVersions = snapshotPresenceVersions(queryClient, ['7'])
    applyPresenceFromGateway(queryClient, {
      changed_at: 3_000,
      guild_ids: [],
      status: 3,
      user_id: '7',
      version: '12',
    })

    reconcilePresenceResolution(
      queryClient,
      {
        presences: [{ lastSeenAt: 2_000, status: 'offline', userId: '7', version: 11n }],
        requestedUserIds: ['7'],
      },
      observedVersions,
    )

    expect(getPresence(queryClient, '7')).toMatchObject({ status: 'idle', version: 12n })
  })

  it('does not let an omitted API response delete a newer realtime event', () => {
    const queryClient = new QueryClient()
    replacePresencesFromReady(queryClient, [
      { last_seen_at: 1_000, status: 2, user_id: '7', version: '10' },
    ])
    const observedVersions = snapshotPresenceVersions(queryClient, ['7'])
    applyPresenceFromGateway(queryClient, {
      changed_at: 3_000,
      guild_ids: [],
      status: 3,
      user_id: '7',
      version: '12',
    })

    reconcilePresenceResolution(
      queryClient,
      { presences: [], requestedUserIds: ['7'] },
      observedVersions,
    )

    expect(getPresence(queryClient, '7')).toMatchObject({ status: 'idle', version: 12n })
  })

  it('resets cached resolutions when READY replaces the aggregate snapshot', () => {
    const queryClient = new QueryClient()
    const resolutionQueryKey = [...presenceResolutionQueryKey, '7'] as const
    queryClient.setQueryData(resolutionQueryKey, {
      observedVersions: new Map(),
      resolution: {
        presences: [{ lastSeenAt: 1_000, status: 'online', userId: '7', version: 10n }],
        requestedUserIds: ['7'],
      },
    })

    replacePresencesFromReady(queryClient, [])

    expect(queryClient.getQueryData(resolutionQueryKey)).toBeUndefined()
  })
})

describe('createPresenceUserIdBatches', () => {
  it('deduplicates, numerically sorts, and respects the public batch limit', () => {
    const userIds = [...Array.from({ length: 205 }, (_, index) => String(205 - index)), '8', '100']

    const batches = createPresenceUserIdBatches([userIds.slice(0, 80), userIds.slice(80)])

    expect(batches.map((batch) => batch.length)).toEqual([100, 100, 5])
    expect(batches.flat()).toEqual(Array.from({ length: 205 }, (_, index) => String(index + 1)))
  })
})

function getPresence(queryClient: QueryClient, userId: string) {
  return queryClient.getQueryData<PresenceCache>(presenceQueryKey)?.get(userId)
}
