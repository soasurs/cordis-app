import { useEffect, type PropsWithChildren } from 'react'
import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import * as Tooltip from '@radix-ui/react-tooltip'

import { subscribeToAuthenticationExpired } from '@/api/authentication'
import { authSessionQueryOptions, setAuthSession } from '@/features/auth/auth-session'

import { queryClient } from '@/app/query-client'
import { GatewayProvider } from '@/app/gateway-provider'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthenticationBootstrap>{children}</AuthenticationBootstrap>
    </QueryClientProvider>
  )
}

function AuthenticationBootstrap({ children }: PropsWithChildren) {
  const sessionQuery = useQuery(authSessionQueryOptions)
  const userId = sessionQuery.data?.profile.userId.toString()

  useEffect(() => subscribeToAuthenticationExpired(() => setAuthSession(queryClient, null)), [])

  if (sessionQuery.isPending) {
    return <AuthenticationLoading />
  }

  if (sessionQuery.isError) {
    return (
      <main className="grid min-h-svh place-items-center bg-canvas px-6 text-ink">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-semibold">Unable to restore your session</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Check your connection, then try again. Your saved session has not been removed.
          </p>
          <button
            type="button"
            disabled={sessionQuery.isFetching}
            onClick={() => void sessionQuery.refetch()}
            className="mt-5 min-h-10 rounded-control border border-brand bg-brand px-4 text-sm font-semibold text-white disabled:opacity-45"
          >
            Try again
          </button>
        </div>
      </main>
    )
  }

  return (
    <GatewayProvider
      enabled={Boolean(sessionQuery.data)}
      key={userId ?? 'anonymous'}
      userId={userId}
    >
      <Tooltip.Provider delayDuration={250}>{children}</Tooltip.Provider>
    </GatewayProvider>
  )
}

function AuthenticationLoading() {
  return (
    <main
      className="grid min-h-svh place-items-center bg-canvas text-ink"
      aria-label="Restoring session"
    >
      <div className="flex items-center gap-3 text-sm font-medium text-muted">
        <span className="size-4 animate-spin rounded-full border-2 border-brand border-r-transparent" />
        Restoring your session
      </div>
    </main>
  )
}
