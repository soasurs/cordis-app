import { queryOptions, type QueryClient } from '@tanstack/react-query'

import { getUserProfile, type PublicUserProfile } from '@/api/user'
import type { UserProfilePayload } from '@/gateway'

export function userProfileQueryKey(userId: string) {
  return ['users', userId, 'profile'] as const
}

export function userProfileQueryOptions(userId: string) {
  return queryOptions({
    queryFn: () => getUserProfile(userId),
    queryKey: userProfileQueryKey(userId),
    staleTime: 5 * 60_000,
  })
}

export function patchUserProfileFromGateway(queryClient: QueryClient, payload: UserProfilePayload) {
  queryClient.setQueryData<PublicUserProfile>(userProfileQueryKey(payload.user_id), (current) => {
    if (!current || current.updatedAt >= payload.updated_at) {
      return current
    }
    return {
      avatarAssetId: payload.avatar_asset_id,
      bio: payload.bio,
      createdAt: payload.created_at,
      name: payload.name,
      updatedAt: payload.updated_at,
      userId: payload.user_id,
      username: payload.username,
    }
  })
}
