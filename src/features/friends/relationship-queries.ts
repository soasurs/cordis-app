import { infiniteQueryOptions, type InfiniteData } from '@tanstack/react-query'

import { listRelationships, type RelationshipPage, type RelationshipType } from '@/api/relationship'

export const relationshipsQueryKey = ['relationships'] as const

export function relationshipListQueryKey(type: RelationshipType) {
  return [...relationshipsQueryKey, type] as const
}

export function relationshipListInfiniteQueryOptions(type: RelationshipType) {
  return infiniteQueryOptions<
    RelationshipPage,
    Error,
    InfiniteData<RelationshipPage>,
    ReturnType<typeof relationshipListQueryKey>,
    string | undefined
  >({
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listRelationships(type, pageParam),
    queryKey: relationshipListQueryKey(type),
    staleTime: 30_000,
  })
}
