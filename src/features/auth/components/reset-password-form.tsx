import { useForm } from '@tanstack/react-form'

import { Button } from '@/components/ui/button'

import { getFieldError, resetPasswordSchema, type ResetPasswordFormValues } from '../validation'
import { FormAlert } from './form-alert'
import { PasswordInput } from './password-input'

interface ResetPasswordFormProps {
  error?: string
  loading?: boolean
  onSubmit: (values: ResetPasswordFormValues) => Promise<void> | void
}

export function ResetPasswordForm({ error, loading = false, onSubmit }: ResetPasswordFormProps) {
  const form = useForm({
    defaultValues: {
      confirmPassword: '',
      newPassword: '',
    } satisfies ResetPasswordFormValues,
    validators: {
      onSubmit: resetPasswordSchema,
    },
    onSubmit: async ({ value }) => onSubmit(resetPasswordSchema.parse(value)),
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
      <form.Field name="newPassword">
        {(field) => (
          <PasswordInput
            required
            autoComplete="new-password"
            error={getFieldError(field.state.meta.errors)}
            hint="Use at least 8 characters"
            label="New password"
            name={field.name}
            placeholder="Enter your new password"
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
            label="Confirm new password"
            name={field.name}
            placeholder="Enter your new password again"
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value)}
          />
        )}
      </form.Field>
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <Button className="mt-1 w-full" loading={loading || isSubmitting} type="submit">
            Update password
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
