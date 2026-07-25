import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form'
import { LoginForm } from '@/features/auth/components/login-form'
import { PasswordResetSent } from '@/features/auth/components/password-reset-sent'
import { RegisterForm } from '@/features/auth/components/register-form'
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form'

describe('LoginForm', () => {
  it('collects credentials and toggles password visibility', async () => {
    const user = userEvent.setup()
    const onForgotPassword = vi.fn()
    const onSubmit = vi.fn()
    render(
      <LoginForm
        forgotPasswordAction={
          <button type="button" onClick={onForgotPassword}>
            Forgot password?
          </button>
        }
        onSubmit={onSubmit}
      />,
    )

    await user.type(screen.getByLabelText('Email address'), 'alex@example.com')
    const password = screen.getByLabelText('Password')
    await user.type(password, 'cordis-password')

    expect(password).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: 'Forgot password?' }))
    expect(onForgotPassword).toHaveBeenCalledOnce()

    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(onSubmit).toHaveBeenCalledWith({
      email: 'alex@example.com',
      password: 'cordis-password',
    })
  })

  it('shows schema errors and blocks an invalid submission', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<LoginForm onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Enter your email address')).toBeInTheDocument()
    expect(screen.getByText('Enter your password')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

describe('ForgotPasswordForm', () => {
  it('submits a valid recovery email', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<ForgotPasswordForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Email address'), 'alex@example.com')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(onSubmit).toHaveBeenCalledWith('alex@example.com')
  })

  it('blocks an invalid recovery email', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<ForgotPasswordForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Email address'), 'invalid')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('renders a neutral sent state without disclosing account existence', () => {
    render(<PasswordResetSent />)

    expect(screen.getByText(/If an account matches that address/)).toBeInTheDocument()
  })
})

describe('RegisterForm', () => {
  it('collects all fields required by the registration flow', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<RegisterForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Display name'), 'Alex Chen')
    await user.type(screen.getByLabelText(/^Username/), 'alex_chen')
    await user.type(screen.getByLabelText('Email address'), 'alex@example.com')
    await user.type(screen.getByLabelText(/^Password/), 'cordis-password')
    await user.type(screen.getByLabelText(/^Confirm password/), 'cordis-password')
    await user.type(screen.getByLabelText(/^Invite code \(optional\)/), 'INVITE')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(onSubmit).toHaveBeenCalledWith({
      confirmPassword: 'cordis-password',
      email: 'alex@example.com',
      inviteCode: 'INVITE',
      name: 'Alex Chen',
      password: 'cordis-password',
      username: 'alex_chen',
    })
  })

  it('validates registration fields with the shared schema', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<RegisterForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Display name'), 'Alex')
    await user.type(screen.getByLabelText(/^Username/), 'Alex-')
    await user.type(screen.getByLabelText('Email address'), 'not-an-email')
    await user.type(screen.getByLabelText(/^Password/), 'short')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(
      await screen.findByText('Use only lowercase letters, numbers, and underscores'),
    ).toBeInTheDocument()
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
    expect(screen.getByText('Password must contain at least 8 characters')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('blocks registration when the passwords do not match', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<RegisterForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Display name'), 'Alex Chen')
    await user.type(screen.getByLabelText(/^Username/), 'alex_chen')
    await user.type(screen.getByLabelText('Email address'), 'alex@example.com')
    await user.type(screen.getByLabelText(/^Password/), 'cordis-password')
    await user.type(screen.getByLabelText(/^Confirm password/), 'different-password')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

describe('ResetPasswordForm', () => {
  it('submits a matching new password', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<ResetPasswordForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/^New password/), 'new-cordis-password')
    await user.type(screen.getByLabelText(/^Confirm new password/), 'new-cordis-password')
    await user.click(screen.getByRole('button', { name: 'Update password' }))

    expect(onSubmit).toHaveBeenCalledWith({
      confirmPassword: 'new-cordis-password',
      newPassword: 'new-cordis-password',
    })
  })

  it('blocks passwords that do not match', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<ResetPasswordForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/^New password/), 'new-cordis-password')
    await user.type(screen.getByLabelText(/^Confirm new password/), 'different-password')
    await user.click(screen.getByRole('button', { name: 'Update password' }))

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
