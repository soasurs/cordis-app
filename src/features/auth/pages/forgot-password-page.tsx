import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

import { requestPasswordReset } from '@/api/authenticator'
import { getApiErrorMessage } from '@/api/errors'
import { AuthCard } from '../components/auth-card'
import { ForgotPasswordForm } from '../components/forgot-password-form'
import { PasswordResetSent } from '../components/password-reset-sent'

export function ForgotPasswordPage() {
  const resetMutation = useMutation({ mutationFn: requestPasswordReset })

  async function handleSubmit(email: string) {
    try {
      await resetMutation.mutateAsync(email)
    } catch {
      // The mutation state exposes the user-facing error below.
    }
  }

  return (
    <AuthCard
      description="Enter the email address associated with your account. If an account exists, we will send you a password reset link."
      eyebrow="Account recovery"
      title="Reset your password"
      footer={
        <p className="text-center text-sm text-muted">
          Remembered your password?{' '}
          <Link className="font-semibold text-brand-text hover:underline" to="/login">
            Back to sign in
          </Link>
        </p>
      }
    >
      {resetMutation.isSuccess ? (
        <PasswordResetSent />
      ) : (
        <ForgotPasswordForm
          error={
            resetMutation.isError
              ? getApiErrorMessage(
                  resetMutation.error,
                  'Unable to send a reset link. Please try again.',
                )
              : undefined
          }
          loading={resetMutation.isPending}
          onSubmit={handleSubmit}
        />
      )}
    </AuthCard>
  )
}
