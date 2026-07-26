import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useState } from 'react'

import { getApiErrorMessage } from '@/api/errors'
import { login } from '@/api/authenticator'
import { getCurrentUser } from '@/api/user'
import { AuthCard } from '@/features/auth/components/auth-card'
import { LoginForm } from '@/features/auth/components/login-form'
import type { LoginFormValues } from '@/features/auth/validation'
import { setAuthSession } from '@/features/auth/auth-session'

export function LoginPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { redirect: redirectTo } = useSearch({ from: '/_auth/login' })
  const [flowError, setFlowError] = useState<string>()
  const loginMutation = useMutation({
    mutationFn: async (values: LoginFormValues) => {
      const outcome = await login(values)

      if (outcome.kind === 'twoFactorRequired') {
        return outcome
      }

      return {
        kind: 'authenticated' as const,
        session: await getCurrentUser(),
      }
    },
  })

  async function handleSubmit(values: LoginFormValues) {
    setFlowError(undefined)
    let outcome: Awaited<ReturnType<typeof loginMutation.mutateAsync>>

    try {
      outcome = await loginMutation.mutateAsync(values)
    } catch {
      return
    }

    if (outcome.kind === 'twoFactorRequired') {
      setFlowError('Two-factor authentication is required for this account.')
      return
    }

    setAuthSession(queryClient, outcome.session)
    await navigate({ href: redirectTo ?? '/' })
  }

  const error = loginMutation.isError
    ? getApiErrorMessage(loginMutation.error, 'Unable to sign in. Please try again.')
    : flowError

  return (
    <AuthCard
      description="Sign in to return to your communities and conversations."
      eyebrow="Welcome back"
      title="Sign in to Cordis"
      footer={
        <p className="text-center text-sm text-muted">
          New to Cordis?{' '}
          <Link className="font-semibold text-brand-text hover:underline" to="/register">
            Create an account
          </Link>
        </p>
      }
    >
      <LoginForm
        error={error}
        forgotPasswordAction={
          <Link
            className="text-xs font-semibold text-brand-text hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-brand"
            to="/forgot-password"
          >
            Forgot password?
          </Link>
        }
        loading={loginMutation.isPending}
        onSubmit={handleSubmit}
      />
    </AuthCard>
  )
}
