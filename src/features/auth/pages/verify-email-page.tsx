import { Link, useSearch } from '@tanstack/react-router'

import { EmailVerificationPanel } from '../components/email-verification-panel'

export function VerifyEmailPage() {
  const { token } = useSearch({ from: '/_auth/verify-email' })
  const state = token ? 'verifying' : 'pending'

  return (
    <div className="rounded-shell border border-line bg-surface p-6 shadow-panel sm:p-8">
      <EmailVerificationPanel onResend={() => undefined} state={state} />
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
