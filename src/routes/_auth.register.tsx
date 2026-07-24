import { createFileRoute, redirect } from '@tanstack/react-router'

import { authSessionQueryOptions } from '@/features/auth/auth-session'
import { RegisterPage } from '@/features/auth/pages/register-page'

export const Route = createFileRoute('/_auth/register')({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(authSessionQueryOptions)

    if (session) {
      throw redirect({ to: '/' })
    }
  },
  component: RegisterPage,
})
