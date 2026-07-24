import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useSearch } from '@tanstack/react-router'

import { confirmPasswordReset } from '@/api/authenticator'
import { getApiErrorMessage } from '@/api/errors'

import { AuthCard } from '../components/auth-card'
import { FormAlert } from '../components/form-alert'
import { ResetPasswordForm } from '../components/reset-password-form'
import type { ResetPasswordFormValues } from '../validation'
import { setAuthSession } from '../auth-session'

export function ResetPasswordPage() {
  const { token } = useSearch({ from: '/_auth/reset-password' })
  const queryClient = useQueryClient()
  const resetMutation = useMutation({
    mutationFn: (values: ResetPasswordFormValues) =>
      confirmPasswordReset(token!, values.newPassword),
  })

  async function handleSubmit(values: ResetPasswordFormValues) {
    try {
      await resetMutation.mutateAsync(values)
      setAuthSession(queryClient, null)
    } catch {
      // The mutation state exposes the user-facing error below.
    }
  }

  if (resetMutation.isSuccess) {
    return <PasswordResetComplete />
  }

  if (!token) {
    return (
      <AuthCard
        description="This password reset link is missing its token or is incomplete."
        eyebrow="Link unavailable"
        title="Request a new reset link"
        footer={<RecoveryLink />}
      >
        <FormAlert>Use the complete link from your password reset email.</FormAlert>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      description="Choose a new password for your Cordis account. All existing sessions will be signed out."
      eyebrow="Account recovery"
      title="Choose a new password"
      footer={<RecoveryLink />}
    >
      <ResetPasswordForm
        error={
          resetMutation.isError
            ? getApiErrorMessage(
                resetMutation.error,
                'This reset link is invalid or has expired. Request a new link and try again.',
              )
            : undefined
        }
        loading={resetMutation.isPending}
        onSubmit={handleSubmit}
      />
    </AuthCard>
  )
}

function PasswordResetComplete() {
  return (
    <AuthCard
      description="Your password has been updated and all existing sessions have been signed out."
      eyebrow="Password updated"
      title="Your account is secure"
      footer={
        <p className="text-center text-sm text-muted">
          <Link className="font-semibold text-brand-text hover:underline" to="/login">
            Continue to sign in
          </Link>
        </p>
      }
    >
      <div className="text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-panel border border-positive/25 bg-positive/10 text-positive">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-6 fill-none stroke-current stroke-2"
          >
            <path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted">
          Sign in again with your new password to return to Cordis.
        </p>
      </div>
    </AuthCard>
  )
}

function RecoveryLink() {
  return (
    <p className="text-center text-sm text-muted">
      Need another link?{' '}
      <Link className="font-semibold text-brand-text hover:underline" to="/forgot-password">
        Request a new one
      </Link>
    </p>
  )
}
