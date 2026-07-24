import { Button } from '@/components/ui/button'
import { FormAlert } from './form-alert'

export type EmailVerificationState = 'invalid' | 'pending' | 'resent' | 'success' | 'verifying'

interface EmailVerificationPanelProps {
  error?: string
  loading?: boolean
  onResend?: () => void
  state: EmailVerificationState
}

const content: Record<
  EmailVerificationState,
  { description: string; eyebrow: string; title: string; tone: string }
> = {
  pending: {
    description:
      'We sent a verification link to your email. Open the message and follow the link to finish setting up your account.',
    eyebrow: 'Check your inbox',
    title: 'Verify your email address',
    tone: 'border-brand/25 bg-brand-soft text-brand-text',
  },
  verifying: {
    description: 'We are confirming your verification link. This usually takes only a moment.',
    eyebrow: 'In progress',
    title: 'Verifying your email',
    tone: 'border-brand/25 bg-brand-soft text-brand-text',
  },
  success: {
    description: 'Your email is verified. You can now sign in to Cordis and join your communities.',
    eyebrow: 'Verification complete',
    title: 'You are all set',
    tone: 'border-positive/25 bg-positive/10 text-positive',
  },
  invalid: {
    description: 'This verification link is invalid or has expired. You can request a new email.',
    eyebrow: 'Link unavailable',
    title: 'We could not verify your email',
    tone: 'border-negative/25 bg-negative/10 text-negative',
  },
  resent: {
    description:
      'A new verification email is on its way. If it does not arrive soon, check your spam folder.',
    eyebrow: 'Email sent',
    title: 'Check your inbox again',
    tone: 'border-positive/25 bg-positive/10 text-positive',
  },
}

export function EmailVerificationPanel({
  error,
  loading = false,
  onResend,
  state,
}: EmailVerificationPanelProps) {
  const current = content[state]

  return (
    <div className="text-center" aria-live="polite">
      <div
        className={`mx-auto grid size-14 place-items-center rounded-panel border ${current.tone}`}
      >
        <StatusIcon state={state} />
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-brand-text">
        {current.eyebrow}
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-[-0.035em]">{current.title}</h1>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted">{current.description}</p>

      {onResend && (state === 'pending' || state === 'invalid') ? (
        <div className="mt-6 space-y-3">
          <FormAlert>{error}</FormAlert>
          <Button className="w-full" loading={loading} onClick={onResend} variant="secondary">
            Resend verification email
          </Button>
        </div>
      ) : null}

      {state === 'verifying' ? (
        <div className="mt-6 flex items-center justify-center gap-2 text-xs font-medium text-subtle">
          <span className="size-3.5 animate-spin rounded-full border-2 border-brand border-r-transparent" />
          Please keep this page open
        </div>
      ) : null}
    </div>
  )
}

function StatusIcon({ state }: { state: EmailVerificationState }) {
  if (state === 'success' || state === 'resent') {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-6 fill-none stroke-current stroke-2"
      >
        <path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (state === 'invalid') {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-6 fill-none stroke-current stroke-2"
      >
        <path d="M12 7v6m0 4h.01" strokeLinecap="round" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    )
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-6 fill-none stroke-current stroke-2"
    >
      <path
        d="M4 7.5 12 13l8-5.5M5 19h14a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Z"
        strokeLinejoin="round"
      />
    </svg>
  )
}
