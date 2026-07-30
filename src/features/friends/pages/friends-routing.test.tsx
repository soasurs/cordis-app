import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as Tooltip from '@radix-ui/react-tooltip'
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
  type AnyRouter,
} from '@tanstack/react-router'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { listRelationships } from '@/api/relationship'
import { authSessionQueryKey } from '@/features/auth/auth-session'
import { guildsQueryKey } from '@/features/guilds/guild-queries'
import { routeTree } from '@/routeTree.gen'
import type { RouterContext } from '@/routes/__root'

vi.mock('@/api/relationship', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/relationship')>()
  return {
    ...original,
    listRelationships: vi.fn(),
  }
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listRelationships).mockResolvedValue({ relationships: [] })
})

describe('friends routing', () => {
  it('opens friends from personal navigation and keeps the selected view in the URL', async () => {
    const router = await renderRoute('/')

    fireEvent.click((await screen.findAllByRole('button', { name: 'Friends' }))[0]!)
    await waitFor(() => expect(router.state.location.pathname).toBe('/friends'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Friends' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Blocked' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/friends/blocked'))
    expect(router.state.location.search).toEqual({})
    expect(
      await screen.findByRole('heading', { level: 2, name: 'No blocked users' }),
    ).toBeInTheDocument()
  })

  it('restores deep-linked friends views and keeps the default view at the base path', async () => {
    const blockedRouter = await renderRoute('/friends/blocked')
    expect(blockedRouter.state.location.pathname).toBe('/friends/blocked')
    expect(
      await screen.findByRole('heading', { level: 2, name: 'No blocked users' }),
    ).toBeInTheDocument()

    blockedRouter.history.destroy()
    cleanup()
    const friendsRouter = await renderRoute('/friends')
    expect(friendsRouter.state.location.pathname).toBe('/friends')
    expect(
      await screen.findByRole('heading', { level: 2, name: 'No friends yet' }),
    ).toBeInTheDocument()
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
