import { Code, ConnectError } from '@connectrpc/connect'
import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authSessionQueryOptions } from '@/features/auth/auth-session'

const userApi = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('@/api/user', () => userApi)

beforeEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe('auth session', () => {
  it('restores the current user through cookie authentication', async () => {
    const session = {
      profile: { name: 'Alex Chen', username: 'alex_chen' },
      user: { email: 'alex@example.com' },
    }
    userApi.getCurrentUser.mockResolvedValue(session)
    const queryClient = createQueryClient()

    await expect(queryClient.fetchQuery(authSessionQueryOptions)).resolves.toBe(session)
    expect(userApi.getCurrentUser).toHaveBeenCalledOnce()
  })

  it('resolves to anonymous when the cookie session is unauthenticated', async () => {
    userApi.getCurrentUser.mockRejectedValue(
      new ConnectError('session unavailable', Code.Unauthenticated),
    )
    const queryClient = createQueryClient()

    await expect(queryClient.fetchQuery(authSessionQueryOptions)).resolves.toBeNull()
    expect(userApi.getCurrentUser).toHaveBeenCalledOnce()
  })

  it('keeps a temporary request failure retryable', async () => {
    userApi.getCurrentUser.mockRejectedValue(new Error('network unavailable'))
    const queryClient = createQueryClient()

    await expect(queryClient.fetchQuery(authSessionQueryOptions)).rejects.toThrow(
      'network unavailable',
    )
  })

  it('does not treat permission errors as an expired session', async () => {
    userApi.getCurrentUser.mockRejectedValue(
      new ConnectError('access denied', Code.PermissionDenied),
    )
    const queryClient = createQueryClient()

    await expect(queryClient.fetchQuery(authSessionQueryOptions)).rejects.toThrow('access denied')
  })

  it('removes credentials persisted by the previous token transport', async () => {
    window.localStorage.setItem('cordis.refreshToken', 'refresh-token')
    window.sessionStorage.setItem('cordis.accessToken', 'access-token')
    window.sessionStorage.setItem('cordis.accessTokenExpiresAt', '1234')
    userApi.getCurrentUser.mockRejectedValue(
      new ConnectError('session unavailable', Code.Unauthenticated),
    )
    const queryClient = createQueryClient()

    await queryClient.fetchQuery(authSessionQueryOptions)

    expect(window.localStorage.getItem('cordis.refreshToken')).toBeNull()
    expect(window.sessionStorage.getItem('cordis.accessToken')).toBeNull()
    expect(window.sessionStorage.getItem('cordis.accessTokenExpiresAt')).toBeNull()
  })
})

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
}
