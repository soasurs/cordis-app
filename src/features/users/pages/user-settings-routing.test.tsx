import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as Tooltip from '@radix-ui/react-tooltip'
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
  type AnyRouter,
} from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authSessionQueryKey } from '@/features/auth/auth-session'
import { guildsQueryKey } from '@/features/guilds/guild-queries'
import { routeTree } from '@/routeTree.gen'
import type { RouterContext } from '@/routes/__root'

const userApi = vi.hoisted(() => ({
  getAvatarUploadConstraints: vi.fn(),
  getCurrentUser: vi.fn(),
}))

vi.mock('@/api/user', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/user')>()
  return { ...actual, ...userApi }
})

beforeEach(() => {
  vi.clearAllMocks()
  userApi.getAvatarUploadConstraints.mockResolvedValue({
    allowedContentTypes: ['image/png'],
    maxFileSizeBytes: 5_000_000,
    maxHeight: 2048,
    maxPixels: 4_000_000,
    maxWidth: 2048,
  })
})

describe('user settings routing', () => {
  it('opens settings from the global rail and returns to the previous page', async () => {
    const router = await renderRoute('/')

    fireEvent.click((await screen.findAllByRole('button', { name: 'User settings' }))[0]!)
    await waitFor(() => expect(router.state.location.pathname).toBe('/settings/profile'))
    expect(await screen.findByRole('heading', { level: 2, name: 'Profile' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Home navigation' })).not.toBeInTheDocument()

    fireEvent.click((await screen.findAllByRole('button', { name: 'Account' }))[0]!)
    await waitFor(() => expect(router.state.location.pathname).toBe('/settings/account'))
    expect(await screen.findByRole('heading', { level: 2, name: 'Account' })).toBeInTheDocument()

    fireEvent.click((await screen.findAllByRole('button', { name: 'Security' }))[0]!)
    await waitFor(() => expect(router.state.location.pathname).toBe('/settings/security'))
    expect(await screen.findByRole('heading', { level: 2, name: 'Security' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Close user settings' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('redirects the settings root to the profile section', async () => {
    const redirectedRouter = await renderRoute('/settings')
    await waitFor(() => expect(redirectedRouter.state.location.pathname).toBe('/settings/profile'))
  })

  it('closes a direct profile link to home', async () => {
    const directRouter = await renderRoute('/settings/profile')
    fireEvent.click(await screen.findByRole('button', { name: 'Close user settings' }))
    await waitFor(() => expect(directRouter.state.location.pathname).toBe('/'))
  })
})

function createQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })
  queryClient.setQueryData(authSessionQueryKey, {
    profile: {
      avatarAssetId: 0n,
      bio: '',
      createdAt: 1_000n,
      name: 'Alex Chen',
      updatedAt: 2_000n,
      userId: 7n,
      username: 'alex_chen',
    },
    user: {
      createdAt: 1_000n,
      email: 'alex@example.com',
      emailVerifiedAt: 1_500n,
      updatedAt: 2_000n,
      userId: 7n,
    },
  })
  queryClient.setQueryData(guildsQueryKey, [])
  return queryClient
}

async function renderRoute(entry: string): Promise<AnyRouter> {
  const queryClient = createQueryClient()
  const router = createRouter({
    context: { queryClient } satisfies RouterContext,
    history: createMemoryHistory({ initialEntries: [entry] }),
    routeTree,
  })

  await router.load()
  render(
    <QueryClientProvider client={queryClient}>
      <Tooltip.Provider>
        <RouterProvider router={router} />
      </Tooltip.Provider>
    </QueryClientProvider>,
  )
  return router
}
