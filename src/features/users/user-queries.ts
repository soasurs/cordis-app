import { queryOptions } from '@tanstack/react-query'

import { getUserProfile } from '@/api/user'

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
