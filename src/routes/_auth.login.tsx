import { createFileRoute, redirect } from '@tanstack/react-router'

import { authSessionQueryOptions } from '@/features/auth/auth-session'
import { LoginPage } from '@/features/auth/pages/login-page'
import { getSafeAppRedirect } from '@/features/guilds/invite-links'

interface LoginSearch {
  redirect?: string
}

export const Route = createFileRoute('/_auth/login')({
  beforeLoad: async ({ context, search }) => {
    const session = await context.queryClient.ensureQueryData(authSessionQueryOptions)

    if (session) {
      throw redirect({ href: search.redirect ?? '/' })
    }
  },
  component: LoginPage,
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: getSafeAppRedirect(search.redirect),
  }),
})
