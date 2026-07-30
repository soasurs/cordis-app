import { describe, expect, it, vi } from 'vitest'

import { listRelationships } from '@/api/relationship'
import {
  flattenRelationships,
  relationshipListInfiniteQueryOptions,
  relationshipListQueryKey,
  relationshipsQueryKey,
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
