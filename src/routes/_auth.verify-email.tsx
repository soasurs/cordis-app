import { createFileRoute } from '@tanstack/react-router'

import { VerifyEmailPage } from '@/features/auth/pages/verify-email-page'

interface VerifyEmailSearch {
  token?: string
}

export const Route = createFileRoute('/_auth/verify-email')({
  validateSearch: (search: Record<string, unknown>): VerifyEmailSearch => ({
    token: typeof search.token === 'string' && search.token ? search.token : undefined,
  }),
  component: VerifyEmailPage,
})
