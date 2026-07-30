import { QueryClient, type InfiniteData } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import {
  listRelationships,
  type RelationshipPage,
  type RelationshipSummary,
  type RelationshipType,
} from '@/api/relationship'
import {
  flattenRelationships,
  removeRelationshipFromApi,
  relationshipListInfiniteQueryOptions,
  relationshipListQueryKey,
  relationshipsQueryKey,
  upsertRelationshipFromApi,
} from '@/features/friends/relationship-queries'

vi.mock('@/api/relationship', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/relationship')>()
  return {
    ...original,
    listRelationships: vi.fn(),
  }
})

describe('relationshipListInfiniteQueryOptions', () => {
  it.each(['friend', 'incoming', 'outgoing', 'blocked'] as const)(
    'scopes the query and request to the %s relationship type',
    async (type) => {
      vi.mocked(listRelationships).mockResolvedValueOnce({
        nextCursor: 'opaque-next',
        relationships: [],
      })
      const options = relationshipListInfiniteQueryOptions(type)

      expect(options.queryKey).toEqual([...relationshipsQueryKey, type])
      expect(options.queryKey).toEqual(relationshipListQueryKey(type))
      expect(options.initialPageParam).toBeUndefined()
      expect(
        options.getNextPageParam(
          { nextCursor: 'opaque-next', relationships: [] },
          [],
          undefined,
          [],
        ),
      ).toBe('opaque-next')
      expect(options.getNextPageParam({ relationships: [] }, [], undefined, [])).toBeUndefined()

      await expect(
        options.queryFn?.({
          client: undefined as never,
          direction: 'forward',
          meta: undefined,
          pageParam: 'opaque-current',
          queryKey: relationshipListQueryKey(type),
          signal: new AbortController().signal,
        }),
      ).resolves.toEqual({
        nextCursor: 'opaque-next',
        relationships: [],
      })
      expect(listRelationships).toHaveBeenCalledWith(type, 'opaque-current')
    },
  )
})

describe('flattenRelationships', () => {
  it('preserves relationship page order', () => {
    expect(
      flattenRelationships({
        pageParams: [undefined, 'next'],
        pages: [
          {
            nextCursor: 'next',
            relationships: [
              {
                createdAt: 2_000,
                profile: {
                  avatarAssetId: '0',
                  bio: '',
                  createdAt: 1_000,
                  name: 'Alex',
                  updatedAt: 1_000,
                  userId: '8',
                  username: 'alex',
                },
                targetId: '8',
                type: 'friend',
                updatedAt: 2_000,
              },
            ],
          },
          {
            relationships: [
              {
                createdAt: 1_500,
                profile: {
                  avatarAssetId: '0',
                  bio: '',
                  createdAt: 1_000,
                  name: 'Blair',
                  updatedAt: 1_000,
                  userId: '9',
                  username: 'blair',
                },
                targetId: '9',
                type: 'friend',
                updatedAt: 1_500,
              },
            ],
          },
        ],
      }),
    ).toEqual([
      expect.objectContaining({ targetId: '8' }),
      expect.objectContaining({ targetId: '9' }),
    ])
  })
})

describe('relationship mutation cache updates', () => {
  it('moves an updated relationship to its current list without duplicates', () => {
    const queryClient = new QueryClient()
    seedRelationships(queryClient, 'incoming', [
      createRelationship('incoming', '8'),
      createRelationship('incoming', '9'),
    ])
    seedRelationships(queryClient, 'friend', [createRelationship('friend', '10')])

    upsertRelationshipFromApi(queryClient, createRelationship('friend', '8'))

    expect(getRelationships(queryClient, 'incoming')).toEqual([
      expect.objectContaining({ targetId: '9' }),
    ])
    expect(getRelationships(queryClient, 'friend')).toEqual([
      expect.objectContaining({ targetId: '8', type: 'friend' }),
      expect.objectContaining({ targetId: '10', type: 'friend' }),
    ])
    expect(queryClient.getQueryData(relationshipListQueryKey('blocked'))).toBeUndefined()
    expect(queryClient.getQueryState(relationshipListQueryKey('friend'))?.isInvalidated).toBe(true)
  })

  it('removes a relationship from every cached page', () => {
    const queryClient = new QueryClient()
    seedRelationships(
      queryClient,
      'outgoing',
      [createRelationship('outgoing', '8')],
      [createRelationship('outgoing', '9'), createRelationship('outgoing', '8')],
    )
    seedRelationships(queryClient, 'blocked', [createRelationship('blocked', '8')])

    removeRelationshipFromApi(queryClient, '8')

    expect(getRelationships(queryClient, 'outgoing')).toEqual([
      expect.objectContaining({ targetId: '9' }),
    ])
    expect(getRelationships(queryClient, 'blocked')).toEqual([])
  })
})

function createRelationship(type: RelationshipType, targetId: string): RelationshipSummary {
  return {
    createdAt: 2_000,
    profile: {
      avatarAssetId: '0',
      bio: '',
      createdAt: 1_000,
      name: `User ${targetId}`,
      updatedAt: 1_000,
      userId: targetId,
      username: `user-${targetId}`,
    },
    targetId,
    type,
    updatedAt: 2_000,
  }
}

function seedRelationships(
  queryClient: QueryClient,
  type: RelationshipType,
  ...pages: RelationshipSummary[][]
) {
  queryClient.setQueryData<InfiniteData<RelationshipPage>>(relationshipListQueryKey(type), {
    pageParams: pages.map((_, index) => (index === 0 ? undefined : `page-${index}`)),
    pages: pages.map((relationships) => ({ relationships })),
  })
}

function getRelationships(queryClient: QueryClient, type: RelationshipType) {
  return flattenRelationships(
    queryClient.getQueryData<InfiniteData<RelationshipPage>>(relationshipListQueryKey(type)),
  )
}
