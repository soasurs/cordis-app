import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authSessionQueryOptions } from '@/features/auth/auth-session'

const authenticationApi = vi.hoisted(() => ({
  refreshAuthentication: vi.fn(),
}))
const sessionApi = vi.hoisted(() => ({
  restoreAccessToken: vi.fn(),
}))
const userApi = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('@/api/refresh', () => authenticationApi)
vi.mock('@/api/session', () => sessionApi)
vi.mock('@/api/user', () => userApi)

beforeEach(() => {
  vi.clearAllMocks()
  sessionApi.restoreAccessToken.mockReturnValue(false)
})

describe('auth session', () => {
  it('reuses a valid access token without refreshing it', async () => {
    const session = {
      profile: { name: 'Alex Chen', username: 'alex_chen' },
      user: { email: 'alex@example.com' },
    }
    sessionApi.restoreAccessToken.mockReturnValue(true)
    userApi.getCurrentUser.mockResolvedValue(session)
    const queryClient = createQueryClient()

    await expect(queryClient.fetchQuery(authSessionQueryOptions)).resolves.toBe(session)
    expect(authenticationApi.refreshAuthentication).not.toHaveBeenCalled()
  })

  it('resolves to anonymous when there is no refreshable session', async () => {
    authenticationApi.refreshAuthentication.mockResolvedValue(false)
    const queryClient = createQueryClient()

    await expect(queryClient.fetchQuery(authSessionQueryOptions)).resolves.toBeNull()
    expect(userApi.getCurrentUser).not.toHaveBeenCalled()
  })

  it('restores the current user after refreshing authentication', async () => {
    const session = {
      profile: { name: 'Alex Chen', username: 'alex_chen' },
      user: { email: 'alex@example.com' },
    }
    authenticationApi.refreshAuthentication.mockResolvedValue(true)
    userApi.getCurrentUser.mockResolvedValue(session)
    const queryClient = createQueryClient()

    await expect(queryClient.fetchQuery(authSessionQueryOptions)).resolves.toBe(session)
    expect(userApi.getCurrentUser).toHaveBeenCalledOnce()
  })

  it('keeps a temporary refresh failure retryable', async () => {
    authenticationApi.refreshAuthentication.mockRejectedValue(new Error('network unavailable'))
    const queryClient = createQueryClient()

    await expect(queryClient.fetchQuery(authSessionQueryOptions)).rejects.toThrow(
      'network unavailable',
    )
  })
})

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
}
