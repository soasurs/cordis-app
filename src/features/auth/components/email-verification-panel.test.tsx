import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { EmailVerificationPanel } from './email-verification-panel'

describe('EmailVerificationPanel', () => {
  it('offers to resend a pending verification email', async () => {
    const user = userEvent.setup()
    const onResend = vi.fn()
    render(<EmailVerificationPanel onResend={onResend} state="pending" />)

    expect(screen.getByRole('heading', { name: 'Verify your email address' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Resend verification email' }))
    expect(onResend).toHaveBeenCalledOnce()
  })

  it('renders the processing, success, and invalid states', () => {
    const { rerender } = render(<EmailVerificationPanel state="verifying" />)
    expect(screen.getByRole('heading', { name: 'Verifying your email' })).toBeInTheDocument()

    rerender(<EmailVerificationPanel state="success" />)
    expect(screen.getByRole('heading', { name: 'You are all set' })).toBeInTheDocument()

    rerender(<EmailVerificationPanel state="invalid" />)
    expect(
      screen.getByRole('heading', { name: 'We could not verify your email' }),
    ).toBeInTheDocument()
  })
})
