import { useForm } from '@tanstack/react-form'

import { Button } from '@/components/ui/button'
import { TextInput } from '@/components/ui/text-input'

import { getFieldError, registerSchema, type RegisterFormValues } from '@/features/auth/validation'
import { FormAlert } from '@/features/auth/components/form-alert'
import { PasswordInput } from '@/features/auth/components/password-input'

interface RegisterFormProps {
  error?: string
  loading?: boolean
  onSubmit: (values: RegisterFormValues) => Promise<void> | void
}

export function RegisterForm({ error, loading = false, onSubmit }: RegisterFormProps) {
  const form = useForm({
    defaultValues: {
      confirmPassword: '',
      email: '',
      inviteCode: '',
      name: '',
      password: '',
      username: '',
    } satisfies RegisterFormValues,
    validators: {
      onSubmit: registerSchema,
    },
    onSubmit: async ({ value }) => onSubmit(registerSchema.parse(value)),
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
      <form.Field name="name">
        {(field) => (
          <TextInput
            required
            autoComplete="name"
            error={getFieldError(field.state.meta.errors)}
            label="Display name"
            name={field.name}
            placeholder="Alex Chen"
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value)}
          />
        )}
      </form.Field>
      <form.Field name="username">
        {(field) => (
          <TextInput
            required
            autoCapitalize="none"
            autoComplete="username"
            error={getFieldError(field.state.meta.errors)}
            hint="Use lowercase letters, numbers, and underscores"
            label="Username"
            name={field.name}
            placeholder="alex_chen"
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value)}
          />
        )}
      </form.Field>
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
            autoComplete="new-password"
            error={getFieldError(field.state.meta.errors)}
            hint="Use at least 8 characters"
            label="Password"
            name={field.name}
            placeholder="Create a secure password"
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value)}
          />
        )}
      </form.Field>
      <form.Field name="confirmPassword">
        {(field) => (
          <PasswordInput
            required
            autoComplete="new-password"
            error={getFieldError(field.state.meta.errors)}
            label="Confirm password"
            name={field.name}
            placeholder="Enter your password again"
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value)}
          />
        )}
      </form.Field>
      <form.Field name="inviteCode">
        {(field) => (
          <TextInput
            autoComplete="off"
            error={getFieldError(field.state.meta.errors)}
            hint="Only required for invite-only registration"
            label="Invite code (optional)"
            name={field.name}
            placeholder="Enter your invite code"
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value)}
          />
        )}
      </form.Field>
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <Button className="mt-1 w-full" loading={loading || isSubmitting} type="submit">
            Create account
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
