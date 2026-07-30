import { infiniteQueryOptions, type InfiniteData, type QueryClient } from '@tanstack/react-query'

import {
  listRelationships,
  type RelationshipPage,
  type RelationshipSummary,
  type RelationshipType,
} from '@/api/relationship'
import type { PublicUserProfile } from '@/api/user'
import type { RelationshipPayload, RelationshipRemovedPayload, UserProfilePayload } from '@/gateway'

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
  upsertRelationshipInCaches(queryClient, relationship)
  invalidateRelationshipQueries(queryClient)
}

export function removeRelationshipFromApi(queryClient: QueryClient, targetId: string) {
  removeRelationshipFromCaches(queryClient, targetId)
  invalidateRelationshipQueries(queryClient)
}

export function upsertRelationshipFromGateway(
  queryClient: QueryClient,
  payload: RelationshipPayload,
) {
  let relationship = toRelationshipSummaryFromGateway(payload)
  const current = findRelationshipInCaches(queryClient, relationship.targetId)
  if (current && current.updatedAt >= relationship.updatedAt) {
    return
  }
  if (current && current.profile.updatedAt > relationship.profile.updatedAt) {
    relationship = { ...relationship, profile: current.profile }
  }
  upsertRelationshipInCaches(queryClient, relationship)
  invalidateRelationshipQueries(queryClient)
}

export function removeRelationshipFromGateway(
  queryClient: QueryClient,
  payload: RelationshipRemovedPayload,
) {
  removeRelationshipFromCaches(queryClient, payload.target_id)
  invalidateRelationshipQueries(queryClient)
}

export function patchRelationshipProfileFromGateway(
  queryClient: QueryClient,
  payload: UserProfilePayload,
) {
  const profile = toPublicUserProfileFromGateway(payload)
  for (const type of relationshipTypes) {
    queryClient.setQueryData<InfiniteData<RelationshipPage>>(
      relationshipListQueryKey(type),
      (current) => {
        if (!current) return current
        let changed = false
        const pages = current.pages.map((page) => {
          let pageChanged = false
          const relationships = page.relationships.map((relationship) => {
            if (
              relationship.targetId !== profile.userId ||
              relationship.profile.updatedAt >= profile.updatedAt
            ) {
              return relationship
            }
            pageChanged = true
            return { ...relationship, profile }
          })
          changed = changed || pageChanged
          return pageChanged ? { ...page, relationships } : page
        })
        return changed ? { ...current, pages } : current
      },
    )
  }
}

export function refreshRelationshipsFromReady(queryClient: QueryClient) {
  invalidateRelationshipQueries(queryClient)
}

export function clearRelationshipQueries(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: relationshipsQueryKey })
}

export function toRelationshipSummaryFromGateway(
  payload: RelationshipPayload,
): RelationshipSummary {
  return {
    createdAt: payload.created_at,
    profile: toPublicUserProfileFromGateway(payload.profile),
    targetId: payload.target_id,
    type: toRelationshipTypeFromGateway(payload.type),
    updatedAt: payload.updated_at,
  }
}

function upsertRelationshipInCaches(queryClient: QueryClient, relationship: RelationshipSummary) {
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

function invalidateRelationshipQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: relationshipsQueryKey })
}

function findRelationshipInCaches(
  queryClient: QueryClient,
  targetId: string,
): RelationshipSummary | undefined {
  let current: RelationshipSummary | undefined
  for (const type of relationshipTypes) {
    const found = flattenRelationships(
      queryClient.getQueryData<InfiniteData<RelationshipPage>>(relationshipListQueryKey(type)),
    ).find((relationship) => relationship.targetId === targetId)
    if (found && (!current || found.updatedAt > current.updatedAt)) {
      current = found
    }
  }
  return current
}

function toRelationshipTypeFromGateway(type: number): RelationshipType {
  switch (type) {
    case 1:
      return 'outgoing'
    case 2:
      return 'incoming'
    case 3:
      return 'friend'
    case 4:
      return 'blocked'
    default:
      throw new Error('relationship type is invalid')
  }
}

function toPublicUserProfileFromGateway(payload: UserProfilePayload): PublicUserProfile {
  return {
    avatarAssetId: payload.avatar_asset_id,
    bio: payload.bio,
    createdAt: payload.created_at,
    name: payload.name,
    updatedAt: payload.updated_at,
    userId: payload.user_id,
    username: payload.username,
  }
}
