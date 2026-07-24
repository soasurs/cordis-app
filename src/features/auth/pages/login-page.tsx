import { Link } from '@tanstack/react-router'

import { AuthCard } from '../components/auth-card'
import { LoginForm } from '../components/login-form'

export function LoginPage() {
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
        forgotPasswordAction={
          <Link
            className="text-xs font-semibold text-brand-text hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-brand"
            to="/forgot-password"
          >
            Forgot password?
          </Link>
        }
        onSubmit={() => undefined}
      />
    </AuthCard>
  )
}
