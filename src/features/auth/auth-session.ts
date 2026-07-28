import { Code, ConnectError } from '@connectrpc/connect'
import { queryOptions, type QueryClient } from '@tanstack/react-query'

import {
  clearLegacyAuthenticationTokens,
  markAuthenticationEstablished,
} from '@/api/authentication'
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
  clearLegacyAuthenticationTokens()

  try {
    const currentUser = await getCurrentUser()
    markAuthenticationEstablished()
    return currentUser
  } catch (error) {
    const code = ConnectError.from(error).code
    if (code === Code.Unauthenticated) {
      return null
    }

    throw error
  }
}
