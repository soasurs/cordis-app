import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useSearch } from '@tanstack/react-router'

import { confirmEmailVerification, requestEmailVerification } from '@/api/authenticator'
import { getApiErrorMessage } from '@/api/errors'
import { EmailVerificationPanel } from '@/features/auth/components/email-verification-panel'

export function VerifyEmailPage() {
  const { email, token } = useSearch({ from: '/_auth/verify-email' })
  const confirmation = useQuery({
    enabled: Boolean(token),
    queryFn: () => confirmEmailVerification(token!),
    queryKey: ['auth', 'email-verification', token],
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  })
  const resend = useMutation({ mutationFn: requestEmailVerification })

  const state = token
    ? confirmation.isError
      ? 'invalid'
      : confirmation.isSuccess
        ? 'success'
        : 'verifying'
    : resend.isSuccess
      ? 'resent'
      : 'pending'

  return (
    <div className="rounded-shell border border-line bg-surface p-6 shadow-panel sm:p-8">
      <EmailVerificationPanel
        error={
          resend.isError
            ? getApiErrorMessage(resend.error, 'Unable to resend the email. Please try again.')
            : undefined
        }
        loading={resend.isPending}
        onResend={email ? () => resend.mutate(email) : undefined}
        state={state}
      />
      {state !== 'verifying' ? (
        <div className="mt-6 border-t border-line pt-5 text-center">
          <Link className="text-sm font-semibold text-brand-text hover:underline" to="/login">
            Back to sign in
          </Link>
        </div>
      ) : null}
    </div>
  )
}
