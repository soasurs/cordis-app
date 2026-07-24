import { Link } from '@tanstack/react-router'

import { AuthCard } from '../components/auth-card'
import { ForgotPasswordForm } from '../components/forgot-password-form'

export function ForgotPasswordPage() {
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
      <ForgotPasswordForm onSubmit={() => undefined} />
    </AuthCard>
  )
}
