import { QueryClient, type InfiniteData } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import { clearGatewayQueries, syncGatewayDispatch } from '@/app/gateway-query-sync'
import type { RelationshipPage, RelationshipSummary, RelationshipType } from '@/api/relationship'
import type { PublicUserProfile } from '@/api/user'
import {
  flattenRelationships,
  relationshipListQueryKey,
} from '@/features/friends/relationship-queries'
import { userProfileQueryKey } from '@/features/users/user-queries'

describe('relationship Gateway query sync', () => {
  it('moves relationships between warm caches and ignores older updates', () => {
    const queryClient = new QueryClient()
    seedRelationships(queryClient, 'incoming', [createRelationship('incoming', 2_000)])
    seedRelationships(queryClient, 'friend', [])

    syncGatewayDispatch(queryClient, {
      data: relationshipPayload(3, 3_000, 'Alex Friend'),
      sequence: 1,
      type: 'relationship.updated',
    })

    expect(getRelationships(queryClient, 'incoming')).toEqual([])
    expect(getRelationships(queryClient, 'friend')).toEqual([
      expect.objectContaining({
        profile: expect.objectContaining({ name: 'Alex Friend' }),
        targetId: '8',
        type: 'friend',
        updatedAt: 3_000,
      }),
    ])
    expect(queryClient.getQueryState(relationshipListQueryKey('friend'))?.isInvalidated).toBe(true)

    syncGatewayDispatch(queryClient, {
      data: relationshipPayload(2, 2_500, 'Stale Alex'),
      sequence: 2,
      type: 'relationship.updated',
    })

    expect(getRelationships(queryClient, 'incoming')).toEqual([])
    expect(getRelationships(queryClient, 'friend')[0]).toMatchObject({
      profile: { name: 'Alex Friend' },
      type: 'friend',
      updatedAt: 3_000,
    })
  })

  it('removes relationships without synthesizing cold caches', () => {
    const queryClient = new QueryClient()
    seedRelationships(queryClient, 'blocked', [createRelationship('blocked', 2_000)])

    syncGatewayDispatch(queryClient, {
      data: { target_id: '8', user_id: '7' },
      sequence: 1,
      type: 'relationship.removed',
    })

    expect(getRelationships(queryClient, 'blocked')).toEqual([])
    expect(queryClient.getQueryData(relationshipListQueryKey('friend'))).toBeUndefined()
  })

  it('patches newer profile snapshots in relationship and profile caches', () => {
    const queryClient = new QueryClient()
    const relationship = createRelationship('friend', 2_000)
    seedRelationships(queryClient, 'friend', [relationship])
    queryClient.setQueryData<PublicUserProfile>(userProfileQueryKey('8'), relationship.profile)

    syncGatewayDispatch(queryClient, {
      data: {
        avatar_asset_id: '88',
        bio: 'Updated bio',
        created_at: 1_000,
        name: 'Alex Updated',
        updated_at: 4_000,
        user_id: '8',
        username: 'alex-updated',
      },
      sequence: 1,
      type: 'user.profile.updated',
    })

    expect(getRelationships(queryClient, 'friend')[0]?.profile).toMatchObject({
      avatarAssetId: '88',
      bio: 'Updated bio',
      name: 'Alex Updated',
      updatedAt: 4_000,
      username: 'alex-updated',
    })
    expect(queryClient.getQueryData(userProfileQueryKey('8'))).toMatchObject({
      name: 'Alex Updated',
      updatedAt: 4_000,
    })
  })

  it('invalidates relationship snapshots on READY and clears them with Gateway state', () => {
    const queryClient = new QueryClient()
    seedRelationships(queryClient, 'friend', [createRelationship('friend', 2_000)])

    syncGatewayDispatch(queryClient, {
      data: {
        access_token_expires_at: 10_000,
        auth_session_id: 'auth-session',
        dm_channels: [],
        guilds: [],
        presence_preference: { status: 'online', version: '1' },
        presences: [],
        read_states: [],
        session_id: 'gateway-session',
        session_node_id: 'node-1',
        user_id: '7',
      },
      sequence: 1,
      type: 'ready',
    })

    expect(queryClient.getQueryState(relationshipListQueryKey('friend'))?.isInvalidated).toBe(true)

    clearGatewayQueries(queryClient)

    expect(queryClient.getQueryData(relationshipListQueryKey('friend'))).toBeUndefined()
  })
})

function relationshipPayload(type: number, updatedAt: number, name: string) {
  return {
    created_at: 2_000,
    profile: {
      avatar_asset_id: '0',
      bio: '',
      created_at: 1_000,
      name,
      updated_at: updatedAt,
      user_id: '8',
      username: 'alex',
    },
    target_id: '8',
    type,
    updated_at: updatedAt,
    user_id: '7',
  }
}

function createRelationship(type: RelationshipType, updatedAt: number): RelationshipSummary {
  return {
    createdAt: 2_000,
    profile: {
      avatarAssetId: '0',
      bio: '',
      createdAt: 1_000,
      name: 'Alex Chen',
      updatedAt: 1_000,
      userId: '8',
      username: 'alex',
    },
    targetId: '8',
    type,
    updatedAt,
  }
}

function seedRelationships(
  queryClient: QueryClient,
  type: RelationshipType,
  relationships: RelationshipSummary[],
) {
  queryClient.setQueryData<InfiniteData<RelationshipPage>>(relationshipListQueryKey(type), {
    pageParams: [undefined],
    pages: [{ relationships }],
  })
}

function getRelationships(queryClient: QueryClient, type: RelationshipType) {
  return flattenRelationships(
    queryClient.getQueryData<InfiniteData<RelationshipPage>>(relationshipListQueryKey(type)),
  )
}
