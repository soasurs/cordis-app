import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authSessionQueryKey } from '@/features/auth/auth-session'
import { UserAccountSettings } from '@/features/users/components/user-account-settings'
import { UserSecuritySettings } from '@/features/users/components/user-security-settings'

const userApi = vi.hoisted(() => ({
  changePassword: vi.fn(),
  checkUsernameAvailability: vi.fn(),
  updateEmail: vi.fn(),
  updateUsername: vi.fn(),
}))

vi.mock('@/api/user', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/user')>()
  return { ...actual, ...userApi }
})

const profile = {
  avatarAssetId: 0n,
  bio: '',
  createdAt: 1_000n,
  name: 'Alex Chen',
  updatedAt: 2_000n,
  userId: 7n,
  username: 'alex_chen',
}
const account = {
  createdAt: 1_000n,
  email: 'alex@example.com',
  emailVerifiedAt: 1_500n,
  updatedAt: 2_000n,
  userId: 7n,
}
const session = { profile, user: account }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('user account and security settings', () => {
  it('updates username and email independently while preserving the session cache', async () => {
    const updatedProfile = { ...profile, updatedAt: 3_000n, username: 'alex_rivera' }
    const updatedAccount = {
      ...account,
      email: 'alex.rivera@example.com',
      emailVerifiedAt: 0n,
      updatedAt: 4_000n,
    }
    userApi.checkUsernameAvailability.mockResolvedValue(true)
    userApi.updateUsername.mockResolvedValue(updatedProfile)
    userApi.updateEmail.mockResolvedValue(updatedAccount)
    const { queryClient } = renderAccountSettings()
    const user = userEvent.setup()

    await user.clear(screen.getByRole('textbox', { name: /^Username/ }))
    await user.type(screen.getByRole('textbox', { name: /^Username/ }), 'alex_rivera')
    await user.click(screen.getByRole('button', { name: 'Save username' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Username updated.')
    expect(userApi.updateUsername).toHaveBeenCalledWith('alex_rivera')
    expect(queryClient.getQueryData(authSessionQueryKey)).toMatchObject({
      profile: { username: 'alex_rivera' },
      user: { email: 'alex@example.com' },
    })

    await user.clear(screen.getByRole('textbox', { name: /^Email address/ }))
    await user.type(
      screen.getByRole('textbox', { name: /^Email address/ }),
      'alex.rivera@example.com',
    )
    await user.click(screen.getByRole('button', { name: 'Save email' }))

    expect(await screen.findByText('Email address updated.')).toBeInTheDocument()
    expect(userApi.updateEmail).toHaveBeenCalledWith('alex.rivera@example.com')
    expect(queryClient.getQueryData(authSessionQueryKey)).toEqual({
      profile: updatedProfile,
      user: updatedAccount,
    })
  })

  it('validates and submits a password change', async () => {
    userApi.changePassword.mockResolvedValue(undefined)
    renderSecuritySettings()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/^Current password/), 'current-password')
    await user.type(screen.getByLabelText(/^New password/), 'new-password')
    await user.type(screen.getByLabelText(/^Confirm new password/), 'new-password')
    await user.click(screen.getByRole('button', { name: 'Change password' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Password changed.')
    expect(userApi.changePassword).toHaveBeenCalledWith('current-password', 'new-password')
    expect(screen.getByLabelText(/^Current password/)).toHaveValue('')
    expect(screen.getByLabelText(/^New password/)).toHaveValue('')
    expect(screen.getByLabelText(/^Confirm new password/)).toHaveValue('')
  })
})

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })
  queryClient.setQueryData(authSessionQueryKey, session)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, wrapper }
}

function renderAccountSettings() {
  const { queryClient, wrapper } = createWrapper()
  render(<UserAccountSettings session={session as never} />, { wrapper })
  return { queryClient }
}

function renderSecuritySettings() {
  const { wrapper } = createWrapper()
  render(<UserSecuritySettings />, { wrapper })
}
