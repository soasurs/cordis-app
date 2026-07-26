import { createFileRoute, redirect } from '@tanstack/react-router'

import { authSessionQueryOptions } from '@/features/auth/auth-session'
import { ProtectedAppOutlet } from '@/features/auth/components/protected-app-outlet'

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(authSessionQueryOptions)

    if (!session) {
      throw redirect({
        search: { redirect: location.pathname },
        to: '/login',
      })
    }
  },
  component: ProtectedAppOutlet,
})
