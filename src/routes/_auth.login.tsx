import { createFileRoute, redirect } from '@tanstack/react-router'

import { authSessionQueryOptions } from '@/features/auth/auth-session'
import { LoginPage } from '@/features/auth/pages/login-page'

export const Route = createFileRoute('/_auth/login')({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(authSessionQueryOptions)

    if (session) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})
