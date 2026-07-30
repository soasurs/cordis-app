import { useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'

import { getApiErrorMessage } from '@/api/errors'
import { changePassword } from '@/api/user'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/features/auth/components/password-input'
import { getFieldError } from '@/features/auth/validation'
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from '@/features/users/account-validation'

const emptyPasswordForm: ChangePasswordFormValues = {
  confirmPassword: '',
  newPassword: '',
  oldPassword: '',
}

export function UserSecuritySettings() {
  const mutation = useMutation({
    mutationFn: ({
      newPassword,
      oldPassword,
    }: Pick<ChangePasswordFormValues, 'newPassword' | 'oldPassword'>) =>
      changePassword(oldPassword, newPassword),
  })
  const form = useForm({
    defaultValues: emptyPasswordForm,
    validators: { onSubmit: changePasswordSchema },
    onSubmit: async ({ value }) => {
      try {
        const parsed = changePasswordSchema.parse(value)
        await mutation.mutateAsync(parsed)
        form.reset(emptyPasswordForm)
      } catch {
        // Keep the submitted values available while rendering the error below.
      }
    },
  })
  const clearResult = () => {
    if (mutation.isError || mutation.isSuccess) mutation.reset()
  }

  return (
    <>
      <div className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-text">
          Account protection
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink">Security</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Change your password and keep access to your account secure.
        </p>
      </div>

      <section className="max-w-2xl rounded-shell border border-line bg-surface-raised p-5 shadow-panel sm:p-6">
        <h3 className="text-base font-semibold text-ink">Change password</h3>
        <p className="mt-1 text-sm leading-6 text-muted">
          After a successful change, Cordis signs out every other session on your account.
        </p>

        {mutation.error ? (
          <div
            role="alert"
            className="mt-5 rounded-control border border-negative/25 bg-negative/10 px-3 py-2.5 text-sm text-negative"
          >
            {getApiErrorMessage(mutation.error, 'Unable to change your password. Try again.')}
          </div>
        ) : mutation.isSuccess ? (
          <div
            role="status"
            className="mt-5 rounded-control border border-positive/25 bg-positive/10 px-3 py-2.5 text-sm text-positive"
          >
            Password changed. Other sessions have been signed out.
          </div>
        ) : null}

        <form
          noValidate
          className="mt-5 grid gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void form.handleSubmit()
          }}
        >
          <form.Field name="oldPassword">
            {(field) => (
              <PasswordInput
                required
                autoComplete="current-password"
                disabled={mutation.isPending}
                error={getFieldError(field.state.meta.errors)}
                label="Current password"
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => {
                  clearResult()
                  field.handleChange(event.target.value)
                }}
              />
            )}
          </form.Field>
          <form.Field name="newPassword">
            {(field) => (
              <PasswordInput
                required
                autoComplete="new-password"
                disabled={mutation.isPending}
                error={getFieldError(field.state.meta.errors)}
                hint="Use at least 8 characters."
                label="New password"
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => {
                  clearResult()
                  field.handleChange(event.target.value)
                }}
              />
            )}
          </form.Field>
          <form.Field name="confirmPassword">
            {(field) => (
              <PasswordInput
                required
                autoComplete="new-password"
                disabled={mutation.isPending}
                error={getFieldError(field.state.meta.errors)}
                label="Confirm new password"
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => {
                  clearResult()
                  field.handleChange(event.target.value)
                }}
              />
            )}
          </form.Field>
          <div className="flex justify-end border-t border-line pt-5">
            <Button loading={mutation.isPending} type="submit">
              Change password
            </Button>
          </div>
        </form>
      </section>
    </>
  )
}
