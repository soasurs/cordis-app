import { createFileRoute } from '@tanstack/react-router'

import { ResetPasswordPage } from '@/features/auth/pages/reset-password-page'

interface ResetPasswordSearch {
  token?: string
}

export const Route = createFileRoute('/_auth/reset-password')({
  validateSearch: (search: Record<string, unknown>): ResetPasswordSearch => ({
    token: typeof search.token === 'string' && search.token ? search.token : undefined,
  }),
  component: ResetPasswordPage,
})
