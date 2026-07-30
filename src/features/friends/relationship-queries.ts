import { infiniteQueryOptions, type InfiniteData, type QueryClient } from '@tanstack/react-query'

import {
  listRelationships,
  type RelationshipPage,
  type RelationshipSummary,
  type RelationshipType,
} from '@/api/relationship'

export const relationshipsQueryKey = ['relationships'] as const
export const relationshipTypes = ['friend', 'incoming', 'outgoing', 'blocked'] as const

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

export function flattenRelationships(data: InfiniteData<RelationshipPage> | undefined) {
  return data?.pages.flatMap((page) => page.relationships) ?? []
}

export function upsertRelationshipFromApi(
  queryClient: QueryClient,
  relationship: RelationshipSummary,
) {
  removeRelationshipFromCaches(queryClient, relationship.targetId)
  queryClient.setQueryData<InfiniteData<RelationshipPage>>(
    relationshipListQueryKey(relationship.type),
    (current) => {
      if (!current) return current
      const [firstPage, ...remainingPages] = current.pages
      if (!firstPage) return current
      return {
        ...current,
        pages: [
          {
            ...firstPage,
            relationships: [relationship, ...firstPage.relationships],
          },
          ...remainingPages,
        ],
      }
    },
  )
  void queryClient.invalidateQueries({ queryKey: relationshipsQueryKey })
}

export function removeRelationshipFromApi(queryClient: QueryClient, targetId: string) {
  removeRelationshipFromCaches(queryClient, targetId)
  void queryClient.invalidateQueries({ queryKey: relationshipsQueryKey })
}

function removeRelationshipFromCaches(queryClient: QueryClient, targetId: string) {
  for (const type of relationshipTypes) {
    queryClient.setQueryData<InfiniteData<RelationshipPage>>(
      relationshipListQueryKey(type),
      (current) => {
        if (!current) return current
        let changed = false
        const pages = current.pages.map((page) => {
          const relationships = page.relationships.filter(
            (relationship) => relationship.targetId !== targetId,
          )
          if (relationships.length === page.relationships.length) return page
          changed = true
          return { ...page, relationships }
        })
        return changed ? { ...current, pages } : current
      },
    )
  }
}
