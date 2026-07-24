import { Link } from '@tanstack/react-router'

import { AuthCard } from '../components/auth-card'
import { RegisterForm } from '../components/register-form'

export function RegisterPage() {
  return (
    <AuthCard
      description="Create one identity that stays with you across Cordis communities."
      eyebrow="Get started"
      title="Create your account"
      footer={
        <p className="text-center text-sm text-muted">
          Already have an account?{' '}
          <Link className="font-semibold text-brand-text hover:underline" to="/login">
            Back to sign in
          </Link>
        </p>
      }
    >
      <RegisterForm onSubmit={() => undefined} />
    </AuthCard>
  )
}
