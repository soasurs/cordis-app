import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { getApiErrorMessage } from '@/api/errors'
import {
  checkUsernameAvailability,
  toPublicUserProfile,
  updateEmail,
  updateUsername,
  type CurrentUser,
} from '@/api/user'
import { Button } from '@/components/ui/button'
import { TextInput } from '@/components/ui/text-input'
import { authSessionQueryKey, setAuthSession } from '@/features/auth/auth-session'
import { getFieldError } from '@/features/auth/validation'
import {
  updateEmailSchema,
  updateUsernameSchema,
  type UpdateEmailFormValues,
  type UpdateUsernameFormValues,
} from '@/features/users/account-validation'
import { userProfileQueryKey } from '@/features/users/user-queries'

export function UserAccountSettings({ session }: { session: CurrentUser }) {
  return (
    <>
      <div className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-text">
          Account identity
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink">Account</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Manage the unique username and email address attached to your account.
        </p>
      </div>

      <div className="grid gap-5">
        <UsernameSettings session={session} />
        <EmailSettings session={session} />
      </div>
    </>
  )
}

function UsernameSettings({ session }: { session: CurrentUser }) {
  const queryClient = useQueryClient()
  const profile = session.profile
  const mutation = useMutation({
    mutationFn: async (username: string) => {
      if (!(await checkUsernameAvailability(username))) {
        throw new UsernameUnavailableError()
      }
      return updateUsername(username)
    },
  })
  const form = useForm({
    defaultValues: { username: profile.username } satisfies UpdateUsernameFormValues,
    validators: { onSubmit: updateUsernameSchema },
    onSubmit: async ({ value }) => {
      try {
        const { username } = updateUsernameSchema.parse(value)
        const updatedProfile = await mutation.mutateAsync(username)
        const currentSession = queryClient.getQueryData<CurrentUser | null>(authSessionQueryKey)
        if (currentSession) {
          setAuthSession(queryClient, { ...currentSession, profile: updatedProfile })
        }
        queryClient.setQueryData(
          userProfileQueryKey(updatedProfile.userId.toString()),
          toPublicUserProfile(updatedProfile),
        )
        form.reset({ username: updatedProfile.username })
      } catch {
        // Keep the submitted username available while rendering the error below.
      }
    },
  })

  return (
    <section className="rounded-shell border border-line bg-surface-raised p-5 shadow-panel sm:p-6">
      <h3 className="text-base font-semibold text-ink">Username</h3>
      <p className="mt-1 text-sm leading-6 text-muted">
        Your globally unique handle is used for mentions and friend discovery.
      </p>
      <SettingsStatus
        className="mt-5"
        error={
          mutation.error instanceof UsernameUnavailableError
            ? 'That username is already taken.'
            : mutation.error
              ? getApiErrorMessage(mutation.error, 'Unable to update your username. Try again.')
              : undefined
        }
        saved={mutation.isSuccess}
        savedMessage="Username updated."
      />
      <form
        noValidate
        className="mt-5 grid gap-5"
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void form.handleSubmit()
        }}
      >
        <form.Field name="username">
          {(field) => (
            <div>
              <TextInput
                required
                autoCapitalize="none"
                autoComplete="username"
                disabled={mutation.isPending}
                error={getFieldError(field.state.meta.errors)}
                hint="Use lowercase letters, numbers, and underscores."
                label="Username"
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => {
                  if (mutation.isError || mutation.isSuccess) mutation.reset()
                  field.handleChange(event.target.value)
                }}
              />
              <UsernameAvailability
                currentUsername={profile.username}
                username={field.state.value}
              />
            </div>
          )}
        </form.Field>
        <div className="flex justify-end border-t border-line pt-5">
          <form.Subscribe
            selector={(state) => [state.isSubmitting, state.values.username] as const}
          >
            {([isSubmitting, username]) => (
              <Button
                disabled={username.trim() === profile.username}
                loading={mutation.isPending || isSubmitting}
                type="submit"
              >
                Save username
              </Button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </section>
  )
}

function EmailSettings({ session }: { session: CurrentUser }) {
  const queryClient = useQueryClient()
  const account = session.user
  const mutation = useMutation({ mutationFn: (email: string) => updateEmail(email) })
  const form = useForm({
    defaultValues: { email: account.email } satisfies UpdateEmailFormValues,
    validators: { onSubmit: updateEmailSchema },
    onSubmit: async ({ value }) => {
      try {
        const { email } = updateEmailSchema.parse(value)
        const updatedUser = await mutation.mutateAsync(email)
        const currentSession = queryClient.getQueryData<CurrentUser | null>(authSessionQueryKey)
        if (currentSession) {
          setAuthSession(queryClient, { ...currentSession, user: updatedUser })
        }
        form.reset({ email: updatedUser.email })
      } catch {
        // Keep the submitted email available while rendering the error below.
      }
    },
  })
  const emailVerified = (account.emailVerifiedAt ?? 0n) > 0n

  return (
    <section className="rounded-shell border border-line bg-surface-raised p-5 shadow-panel sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-base font-semibold text-ink">Email address</h3>
        <span
          className={`rounded-control border px-2 py-1 text-[0.65rem] font-semibold ${
            emailVerified
              ? 'border-positive/25 bg-positive/10 text-positive'
              : 'border-warning/25 bg-warning/10 text-warning'
          }`}
        >
          {emailVerified ? 'Verified' : 'Not verified'}
        </span>
      </div>
      <p className="mt-1 text-sm leading-6 text-muted">
        Used for sign-in, account recovery, and security notifications.
      </p>
      <SettingsStatus
        className="mt-5"
        error={
          mutation.error
            ? getApiErrorMessage(mutation.error, 'Unable to update your email address. Try again.')
            : undefined
        }
        saved={mutation.isSuccess}
        savedMessage="Email address updated."
      />
      <form
        noValidate
        className="mt-5 grid gap-5"
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void form.handleSubmit()
        }}
      >
        <form.Field name="email">
          {(field) => (
            <TextInput
              required
              autoCapitalize="none"
              autoComplete="email"
              disabled={mutation.isPending}
              error={getFieldError(field.state.meta.errors)}
              hint="Changing your email address may require verification."
              label="Email address"
              name={field.name}
              type="email"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => {
                if (mutation.isError || mutation.isSuccess) mutation.reset()
                field.handleChange(event.target.value)
              }}
            />
          )}
        </form.Field>
        <div className="flex justify-end border-t border-line pt-5">
          <form.Subscribe selector={(state) => [state.isSubmitting, state.values.email] as const}>
            {([isSubmitting, email]) => (
              <Button
                disabled={email.trim() === account.email}
                loading={mutation.isPending || isSubmitting}
                type="submit"
              >
                Save email
              </Button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </section>
  )
}

function UsernameAvailability({
  currentUsername,
  username,
}: {
  currentUsername: string
  username: string
}) {
  const normalized = username.trim()
  const debouncedUsername = useDebouncedValue(normalized, 350)
  const valid = updateUsernameSchema.safeParse({ username: normalized }).success
  const changed = normalized !== currentUsername
  const query = useQuery({
    enabled: valid && changed && debouncedUsername === normalized,
    queryFn: () => checkUsernameAvailability(debouncedUsername),
    queryKey: ['users', 'username-availability', debouncedUsername],
    retry: false,
    staleTime: 30_000,
  })

  if (!valid || !changed) return null
  if (debouncedUsername !== normalized || query.isPending) {
    return <p className="mt-2 text-xs text-subtle">Checking availability…</p>
  }
  if (query.isError) {
    return <p className="mt-2 text-xs text-warning">Availability could not be checked.</p>
  }
  return (
    <p className={`mt-2 text-xs ${query.data ? 'text-positive' : 'text-negative'}`}>
      {query.data ? 'Username is available.' : 'Username is already taken.'}
    </p>
  )
}

function useDebouncedValue(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay)
    return () => window.clearTimeout(timeout)
  }, [delay, value])
  return debouncedValue
}

function SettingsStatus({
  className = '',
  error,
  saved,
  savedMessage,
}: {
  className?: string
  error?: string
  saved: boolean
  savedMessage: string
}) {
  if (error) {
    return (
      <div
        role="alert"
        className={`${className} rounded-control border border-negative/25 bg-negative/10 px-3 py-2.5 text-sm text-negative`}
      >
        {error}
      </div>
    )
  }
  return saved ? (
    <div
      role="status"
      className={`${className} rounded-control border border-positive/25 bg-positive/10 px-3 py-2.5 text-sm text-positive`}
    >
      {savedMessage}
    </div>
  ) : null
}

class UsernameUnavailableError extends Error {}
