import { useForm } from '@tanstack/react-form'

import { Button } from '@/components/ui/button'
import { TextInput } from '@/components/ui/text-input'

import { forgotPasswordSchema, getFieldError } from '../validation'
import { FormAlert } from './form-alert'

interface ForgotPasswordFormProps {
  error?: string
  loading?: boolean
  onSubmit: (email: string) => Promise<void> | void
}

export function ForgotPasswordForm({ error, loading = false, onSubmit }: ForgotPasswordFormProps) {
  const form = useForm({
    defaultValues: {
      email: '',
    },
    validators: {
      onSubmit: forgotPasswordSchema,
    },
    onSubmit: async ({ value }) => onSubmit(forgotPasswordSchema.parse(value).email),
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
            autoFocus
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
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <Button className="mt-1 w-full" loading={loading || isSubmitting} type="submit">
            Send reset link
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
