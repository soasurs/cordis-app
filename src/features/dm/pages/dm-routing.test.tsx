import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as Tooltip from '@radix-ui/react-tooltip'
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
  type AnyRouter,
} from '@tanstack/react-router'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { listDmChannels } from '@/api/dm'
import { getReadStatesForDm, listMessages } from '@/api/message'
import { authSessionQueryKey } from '@/features/auth/auth-session'
import { guildsQueryKey } from '@/features/guilds/guild-queries'
import { routeTree } from '@/routeTree.gen'
import type { RouterContext } from '@/routes/__root'

vi.mock('@/api/dm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/dm')>()
  return {
    ...actual,
    listDmChannels: vi.fn(),
  }
})

vi.mock('@/api/message', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/message')>()
  return {
    ...actual,
    getReadStatesForDm: vi.fn(),
    listMessages: vi.fn(),
  }
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listDmChannels).mockResolvedValue({
    channels: [
      {
        channelId: '43',
        createdAt: 2_000,
        recipient: {
          avatarAssetId: '0',
          bio: '',
          createdAt: 1_000,
          name: 'Alex Chen',
          updatedAt: 1_000,
          userId: '8',
          username: 'alex_chen',
        },
      },
    ],
    nextCursor: undefined,
  })
  vi.mocked(getReadStatesForDm).mockResolvedValue({ channels: [], readStates: [] })
  vi.mocked(listMessages).mockResolvedValue({
    afterCursor: undefined,
    beforeCursor: undefined,
    messages: [],
  })
})

describe('DM routing', () => {
  it('opens messages from personal navigation and navigates into a conversation', async () => {
    const router = await renderRoute('/')

    fireEvent.click((await screen.findAllByRole('button', { name: 'Messages' }))[0]!)
    await waitFor(() => expect(router.state.location.pathname).toBe('/dm'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Messages' })).toBeInTheDocument()

    fireEvent.click((await screen.findAllByRole('button', { name: /@alex_chen/ }))[0]!)
    await waitFor(() => expect(router.state.location.pathname).toBe('/dm/43'))
    expect(await screen.findByRole('heading', { name: 'Alex Chen' })).toBeInTheDocument()
  })

  it('restores a deep-linked conversation and keeps the message list context', async () => {
    const router = await renderRoute('/dm/43')

    expect(router.state.location.pathname).toBe('/dm/43')
    expect(await screen.findByRole('heading', { name: 'Alex Chen' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /@alex_chen/ })[0]).toHaveAttribute(
      'aria-current',
      'page',
    )
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
      name: 'Maya',
      updatedAt: 2_000n,
      userId: 9n,
      username: 'maya',
    },
    user: {
      createdAt: 1_000n,
      email: 'maya@example.com',
      emailVerifiedAt: 1_500n,
      updatedAt: 2_000n,
      userId: 9n,
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

afterEach(() => {
  cleanup()
})
