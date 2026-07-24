import { createFileRoute } from '@tanstack/react-router'

import { VerifyEmailPage } from '@/features/auth/pages/verify-email-page'

interface VerifyEmailSearch {
  email?: string
  token?: string
}

export const Route = createFileRoute('/_auth/verify-email')({
  validateSearch: (search: Record<string, unknown>): VerifyEmailSearch => ({
    email: typeof search.email === 'string' && search.email ? search.email : undefined,
    token: typeof search.token === 'string' && search.token ? search.token : undefined,
  }),
  component: VerifyEmailPage,
})
