import { useForm } from '@tanstack/react-form'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { TextInput } from '@/components/ui/text-input'

import { getFieldError, loginSchema, type LoginFormValues } from '@/features/auth/validation'
import { FormAlert } from '@/features/auth/components/form-alert'
import { PasswordInput } from '@/features/auth/components/password-input'

interface LoginFormProps {
  error?: string
  forgotPasswordAction?: ReactNode
  loading?: boolean
  onSubmit: (values: LoginFormValues) => Promise<void> | void
}

export function LoginForm({
  error,
  forgotPasswordAction,
  loading = false,
  onSubmit,
}: LoginFormProps) {
  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    } satisfies LoginFormValues,
    validators: {
      onSubmit: loginSchema,
    },
    onSubmit: async ({ value }) => onSubmit(loginSchema.parse(value)),
  })

  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <FormAlert>{error}</FormAlert>
      <form.Field name="email">
        {(field) => (
          <TextInput
            required
            autoComplete="email"
            error={getFieldError(field.state.meta.errors)}
            label="Email address"
            name={field.name}
            placeholder="you@example.com"
            type="email"
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value)}
          />
        )}
      </form.Field>
      <form.Field name="password">
        {(field) => (
          <PasswordInput
            required
            autoComplete="current-password"
            error={getFieldError(field.state.meta.errors)}
            label="Password"
            name={field.name}
            placeholder="Enter your password"
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value)}
          />
        )}
      </form.Field>
      {forgotPasswordAction ? (
        <div className="w-fit justify-self-end">{forgotPasswordAction}</div>
      ) : null}
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <Button className="mt-1 w-full" loading={loading || isSubmitting} type="submit">
            Sign in
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
