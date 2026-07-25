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
import {
  guildChannelsQueryKey,
  guildsQueryKey,
  type GuildChannelSummary,
} from '@/features/guilds/guild-queries'
import { routeTree } from '@/routeTree.gen'
import type { RouterContext } from '@/routes/__root'

const guildApi = vi.hoisted(() => ({
  createGuild: vi.fn(),
  createGuildRole: vi.fn(),
  deleteGuildRole: vi.fn(),
  guildPermission: {
    administrator: '1',
    banMembers: '512',
    createInvite: '1024',
    kickMembers: '16',
    manageChannels: '128',
    manageGuild: '2',
    manageMembers: '8',
    manageMessages: '256',
    manageRoles: '4',
    sendMessages: '64',
    viewChannel: '32',
  },
  listGuildChannels: vi.fn(),
  listGuildMembers: vi.fn(),
  listGuildRoles: vi.fn(),
  reorderGuildRoles: vi.fn(),
  updateGuild: vi.fn(),
  updateGuildRole: vi.fn(),
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
  guildApi.listGuildMembers.mockResolvedValue({ members: [] })
  guildApi.listGuildRoles.mockResolvedValue([])
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

  it('closes community settings from a nested section without stepping through route history', async () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData(guildChannelsQueryKey('42'), channels)
    const router = await renderRoute('/guilds/42/channels/43', queryClient)

    fireEvent.click(await screen.findByRole('button', { name: 'Community menu' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Community settings' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/guilds/42/settings/overview'))

    fireEvent.click((await screen.findAllByRole('button', { name: 'Roles' }))[0]!)
    await waitFor(() => expect(router.state.location.pathname).toBe('/guilds/42/settings/roles'))

    fireEvent.click(await screen.findByRole('button', { name: 'Close community settings' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/guilds/42/channels/43'))
  })

  it('returns a direct settings link to the guild when there is no history entry', async () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData(guildChannelsQueryKey('42'), channels)
    const router = await renderRoute('/guilds/42/settings/roles', queryClient)

    fireEvent.click(await screen.findByRole('button', { name: 'Close community settings' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/guilds/42/channels/43'))
  })

  it('stores the selected guild settings section in the path', async () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData(guildChannelsQueryKey('42'), channels)
    const router = await renderRoute('/guilds/42/settings/overview', queryClient)

    fireEvent.click((await screen.findAllByRole('button', { name: 'Roles' }))[0]!)

    await waitFor(() => expect(router.state.location.pathname).toBe('/guilds/42/settings/roles'))
    expect(router.state.location.search).toEqual({})
    expect(await screen.findByRole('heading', { level: 2, name: 'Roles' })).toBeInTheDocument()
  })

  it('redirects an unknown guild settings section to overview', async () => {
    const router = await renderRoute('/guilds/42/settings/unknown')

    await waitFor(() => expect(router.state.location.pathname).toBe('/guilds/42/settings/overview'))
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
    user: { email: 'alex@example.com', userId: 7n },
  })
  queryClient.setQueryData(guildsQueryKey, [
    {
      createdAt: 1_000,
      description: '',
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
      <Tooltip.Provider>
        <RouterProvider router={router} />
      </Tooltip.Provider>
    </QueryClientProvider>,
  )
  return router
}
