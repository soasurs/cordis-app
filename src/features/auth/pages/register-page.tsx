import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'

import { registerAccount } from '@/api/authenticator'
import { getApiErrorMessage } from '@/api/errors'
import { AuthCard } from '@/features/auth/components/auth-card'
import { RegisterForm } from '@/features/auth/components/register-form'
import type { RegisterFormValues } from '@/features/auth/validation'

export function RegisterPage() {
  const navigate = useNavigate()
  const registerMutation = useMutation({
    mutationFn: (values: RegisterFormValues) =>
      registerAccount({
        email: values.email,
        inviteCode: values.inviteCode,
        name: values.name,
        password: values.password,
        username: values.username,
      }),
  })

  async function handleSubmit(values: RegisterFormValues) {
    try {
      await registerMutation.mutateAsync(values)
    } catch {
      return
    }

    await navigate({
      to: '/verify-email',
      search: { email: values.email },
    })
  }

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
      <RegisterForm
        error={
          registerMutation.isError
            ? getApiErrorMessage(
                registerMutation.error,
                'Unable to create your account. Please try again.',
              )
            : undefined
        }
        loading={registerMutation.isPending}
        onSubmit={handleSubmit}
      />
    </AuthCard>
  )
}
