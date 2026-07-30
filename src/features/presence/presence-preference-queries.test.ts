import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import {
  applyPresencePreferenceFromGateway,
  discardPendingPresencePreference,
  presencePreferenceQueryKey,
  replacePresencePreferenceFromReady,
  setPresencePreferenceStatus,
  type UserPresencePreference,
} from '@/features/presence/presence-preference-queries'

describe('presence preference queries', () => {
  it('replaces the local hint from ready and applies only newer preference events', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData<UserPresencePreference>(presencePreferenceQueryKey('7'), {
      status: 'invisible',
      version: 0n,
    })

    replacePresencePreferenceFromReady(queryClient, '7', {
      status: 'online',
      version: '10',
    })
    applyPresencePreferenceFromGateway(queryClient, {
      status: 'dnd',
      user_id: '7',
      version: '12',
    })
    applyPresencePreferenceFromGateway(queryClient, {
      status: 'idle',
      user_id: '7',
      version: '11',
    })

    expect(
      queryClient.getQueryData<UserPresencePreference>(presencePreferenceQueryKey('7')),
    ).toEqual({
      status: 'dnd',
      version: 12n,
    })
  })

  it('keeps the authoritative version while optimistically changing status', () => {
    const queryClient = new QueryClient()
    replacePresencePreferenceFromReady(queryClient, '7', {
      status: 'online',
      version: '10',
    })

    setPresencePreferenceStatus(queryClient, '7', 'idle')

    expect(
      queryClient.getQueryData<UserPresencePreference>(presencePreferenceQueryKey('7')),
    ).toEqual({
      pendingStatus: 'idle',
      status: 'online',
      version: 10n,
    })
  })

  it('preserves a selection made during ready assembly until the server confirms it', () => {
    const queryClient = new QueryClient()
    setPresencePreferenceStatus(queryClient, '7', 'idle')

    replacePresencePreferenceFromReady(queryClient, '7', {
      status: 'online',
      version: '10',
    })
    expect(
      queryClient.getQueryData<UserPresencePreference>(presencePreferenceQueryKey('7')),
    ).toEqual({
      pendingStatus: 'idle',
      status: 'online',
      version: 10n,
    })

    applyPresencePreferenceFromGateway(queryClient, {
      status: 'idle',
      user_id: '7',
      version: '11',
    })
    expect(
      queryClient.getQueryData<UserPresencePreference>(presencePreferenceQueryKey('7')),
    ).toEqual({
      status: 'idle',
      version: 11n,
    })
  })

  it('accepts a newer authoritative status over a pending selection', () => {
    const queryClient = new QueryClient()
    replacePresencePreferenceFromReady(queryClient, '7', {
      status: 'online',
      version: '10',
    })
    setPresencePreferenceStatus(queryClient, '7', 'idle')

    applyPresencePreferenceFromGateway(queryClient, {
      status: 'dnd',
      user_id: '7',
      version: '11',
    })

    expect(
      queryClient.getQueryData<UserPresencePreference>(presencePreferenceQueryKey('7')),
    ).toEqual({
      status: 'dnd',
      version: 11n,
    })
  })

  it('discards an unconfirmed selection after a delivery failure', () => {
    const queryClient = new QueryClient()
    replacePresencePreferenceFromReady(queryClient, '7', {
      status: 'online',
      version: '10',
    })
    setPresencePreferenceStatus(queryClient, '7', 'idle')

    discardPendingPresencePreference(queryClient, '7')

    expect(
      queryClient.getQueryData<UserPresencePreference>(presencePreferenceQueryKey('7')),
    ).toEqual({
      status: 'online',
      version: 10n,
    })
  })

  it('rejects invalid preference snapshots', () => {
    const queryClient = new QueryClient()

    expect(() =>
      replacePresencePreferenceFromReady(queryClient, '7', {
        status: 'online',
        version: '0',
      }),
    ).toThrow('presence preference version is invalid')
  })
})
