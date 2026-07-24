import { queryOptions, type QueryClient } from '@tanstack/react-query'

import { refreshAuthentication } from '@/api/refresh'
import { restoreAccessToken } from '@/api/session'
import { getCurrentUser, type CurrentUser } from '@/api/user'

export const authSessionQueryKey = ['auth', 'current-user'] as const

export const authSessionQueryOptions = queryOptions({
  queryFn: restoreAuthSession,
  queryKey: authSessionQueryKey,
  retry: false,
  staleTime: Number.POSITIVE_INFINITY,
})

export function setAuthSession(queryClient: QueryClient, session: CurrentUser | null) {
  queryClient.setQueryData(authSessionQueryKey, session)
}

async function restoreAuthSession() {
  if (restoreAccessToken()) {
    return getCurrentUser()
  }

  const authenticated = await refreshAuthentication()

  if (!authenticated) {
    return null
  }

  return getCurrentUser()
}
