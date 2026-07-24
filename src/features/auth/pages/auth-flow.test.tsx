import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
  type AnyRouter,
} from '@tanstack/react-router'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { routeTree } from '@/routeTree.gen'
import { authSessionQueryKey, setAuthSession } from '@/features/auth/auth-session'
import type { RouterContext } from '@/routes/__root'

const authenticationApi = vi.hoisted(() => ({
  confirmEmailVerification: vi.fn(),
  confirmPasswordReset: vi.fn(),
  login: vi.fn(),
  registerAccount: vi.fn(),
  requestEmailVerification: vi.fn(),
  requestPasswordReset: vi.fn(),
}))
const userApi = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}))

const testSession = {
  profile: { name: 'Alex Chen', username: 'alex_chen' },
  user: { email: 'alex@example.com' },
}

vi.mock('@/api/authenticator', () => authenticationApi)
vi.mock('@/api/user', () => userApi)

beforeEach(() => {
  vi.clearAllMocks()
  userApi.getCurrentUser.mockResolvedValue(testSession)
})

describe('authentication pages', () => {
  it('redirects an anonymous visitor from the application to sign in', async () => {
    const router = await renderRoute('/')

    expect(router.state.location.pathname).toBe('/login')
  })

  it('redirects an authenticated visitor away from sign in', async () => {
    const router = await renderRoute('/login', testSession)

    expect(router.state.location.pathname).toBe('/')
  })

  it('leaves the protected application when its session is cleared', async () => {
    const router = await renderRoute('/', testSession)
    const { queryClient } = router.options.context as RouterContext

    act(() => setAuthSession(queryClient, null))

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })

  it('signs in and opens the application', async () => {
    authenticationApi.login.mockResolvedValue({ kind: 'authenticated' })
    const router = await renderRoute('/login')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Email address'), 'alex@example.com')
    await user.type(screen.getByLabelText('Password'), 'cordis-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(authenticationApi.login.mock.calls[0]?.[0]).toEqual({
      email: 'alex@example.com',
      password: 'cordis-password',
    })
  })

  it('shows a safe error when sign-in fails', async () => {
    authenticationApi.login.mockRejectedValue(new Error('private server error'))
    await renderRoute('/login')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Email address'), 'alex@example.com')
    await user.type(screen.getByLabelText('Password'), 'incorrect-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to sign in. Please try again.',
    )
  })

  it('registers an account and keeps its email for verification resends', async () => {
    authenticationApi.registerAccount.mockResolvedValue(undefined)
    const router = await renderRoute('/register')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Display name'), 'Alex Chen')
    await user.type(screen.getByLabelText(/^Username/), 'alex_chen')
    await user.type(screen.getByLabelText('Email address'), 'alex@example.com')
    await user.type(screen.getByLabelText(/^Password/), 'cordis-password')
    await user.type(screen.getByLabelText(/^Confirm password/), 'cordis-password')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/verify-email'))
    expect(router.state.location.search).toEqual({ email: 'alex@example.com' })
    expect(authenticationApi.registerAccount.mock.calls[0]?.[0]).toEqual({
      email: 'alex@example.com',
      inviteCode: '',
      name: 'Alex Chen',
      password: 'cordis-password',
      username: 'alex_chen',
    })
  })

  it('shows the neutral sent state after requesting a password reset', async () => {
    authenticationApi.requestPasswordReset.mockResolvedValue(undefined)
    await renderRoute('/forgot-password')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Email address'), 'alex@example.com')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(await screen.findByText(/If an account matches that address/)).toBeInTheDocument()
    expect(authenticationApi.requestPasswordReset.mock.calls[0]?.[0]).toBe('alex@example.com')
  })

  it('sets a new password from a reset link', async () => {
    authenticationApi.confirmPasswordReset.mockResolvedValue(undefined)
    await renderRoute('/reset-password?token=reset-token')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/^New password/), 'new-cordis-password')
    await user.type(screen.getByLabelText(/^Confirm new password/), 'new-cordis-password')
    await user.click(screen.getByRole('button', { name: 'Update password' }))

    expect(
      await screen.findByRole('heading', { name: 'Your account is secure' }),
    ).toBeInTheDocument()
    expect(authenticationApi.confirmPasswordReset.mock.calls[0]?.slice(0, 2)).toEqual([
      'reset-token',
      'new-cordis-password',
    ])
  })

  it('keeps the reset form available when the link is rejected', async () => {
    authenticationApi.confirmPasswordReset.mockRejectedValue(new Error('private token error'))
    await renderRoute('/reset-password?token=expired-token')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/^New password/), 'new-cordis-password')
    await user.type(screen.getByLabelText(/^Confirm new password/), 'new-cordis-password')
    await user.click(screen.getByRole('button', { name: 'Update password' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This reset link is invalid or has expired. Request a new link and try again.',
    )
    expect(screen.getByRole('button', { name: 'Update password' })).toBeEnabled()
  })

  it('rejects an incomplete reset link before calling the API', async () => {
    await renderRoute('/reset-password')

    expect(screen.getByRole('heading', { name: 'Request a new reset link' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Use the complete link from your password reset email.',
    )
    expect(authenticationApi.confirmPasswordReset).not.toHaveBeenCalled()
  })

  it('confirms an email token once and shows the successful state', async () => {
    authenticationApi.confirmEmailVerification.mockResolvedValue(true)
    await renderRoute('/verify-email?token=verification-token')

    expect(await screen.findByRole('heading', { name: 'You are all set' })).toBeInTheDocument()
    expect(authenticationApi.confirmEmailVerification).toHaveBeenCalledOnce()
    expect(authenticationApi.confirmEmailVerification).toHaveBeenCalledWith('verification-token')
  })

  it('resends a verification email retained after registration', async () => {
    authenticationApi.requestEmailVerification.mockResolvedValue(undefined)
    await renderRoute('/verify-email?email=alex%40example.com')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Resend verification email' }))

    expect(
      await screen.findByRole('heading', { name: 'Check your inbox again' }),
    ).toBeInTheDocument()
    expect(authenticationApi.requestEmailVerification.mock.calls[0]?.[0]).toBe('alex@example.com')
  })
})

async function renderRoute(entry: string, session: unknown = null): Promise<AnyRouter> {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })
  queryClient.setQueryData(authSessionQueryKey, session)
  const router = createRouter({
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [entry] }),
    routeTree,
  })

  await router.load()
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return router
}
