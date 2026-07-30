import { describe, expect, it, vi } from 'vitest'

import { listRelationships } from '@/api/relationship'
import {
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
