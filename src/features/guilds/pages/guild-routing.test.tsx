import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
  type AnyRouter,
} from '@tanstack/react-router'
import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authSessionQueryKey } from '@/features/auth/auth-session'
import {
  guildChannelsQueryKey,
  guildsQueryKey,
  type GuildChannelSummary,
} from '@/features/guilds/guild-queries'
import { routeTree } from '@/routeTree.gen'
import type { RouterContext } from '@/routes/__root'

const guildApi = vi.hoisted(() => ({
  createGuild: vi.fn(),
  listGuildChannels: vi.fn(),
}))

vi.mock('@/api/guild', () => guildApi)

const channels: GuildChannelSummary[] = [
  {
    guildId: '42',
    id: '43',
    name: 'general',
    position: 0,
    revision: 1,
    topic: '',
    type: 1,
  },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('guild routing', () => {
  it('loads a missing channel list and redirects a guild link to its first channel', async () => {
    guildApi.listGuildChannels.mockResolvedValue(channels)
    const router = await renderRoute('/guilds/42')

    await waitFor(() => expect(router.state.location.pathname).toBe('/guilds/42/channels/43'))
    expect(guildApi.listGuildChannels).toHaveBeenCalledOnce()
  })

  it('keeps a channel deep link and reuses the READY channel cache', async () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData(guildChannelsQueryKey('42'), channels)
    const router = await renderRoute('/guilds/42/channels/43', queryClient)

    expect(router.state.location.pathname).toBe('/guilds/42/channels/43')
    expect(guildApi.listGuildChannels).not.toHaveBeenCalled()
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
    profile: { name: 'Alex Chen', username: 'alex_chen' },
    user: { email: 'alex@example.com' },
  })
  queryClient.setQueryData(guildsQueryKey, [
    {
      createdAt: 1_000,
      iconAssetId: '0',
      id: '42',
      name: 'Cordis Studio',
      ownerId: '7',
      revision: 1,
      updatedAt: 1_000,
    },
  ])
  return queryClient
}

async function renderRoute(entry: string, queryClient = createQueryClient()): Promise<AnyRouter> {
  const router = createRouter({
    context: { queryClient } satisfies RouterContext,
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
