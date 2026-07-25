import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { guildChannelsQueryKey, type GuildChannelSummary } from '@/features/guilds/guild-queries'
import { useChannelReordering } from '@/features/guilds/use-channel-reordering'

const guildApi = vi.hoisted(() => ({
  reorderGuildChannels: vi.fn(),
}))

vi.mock('@/api/guild', () => guildApi)

const previousChannels: GuildChannelSummary[] = [
  channel('43', 1, 0),
  channel('45', 2, 1),
  { ...channel('46', 1, 2), parentId: '45' },
]
const nextChannels: GuildChannelSummary[] = [
  { ...previousChannels[0]!, parentId: '45', position: 2 },
  previousChannels[1]!,
  { ...previousChannels[2]!, position: 0 },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useChannelReordering', () => {
  it('optimistically moves a channel before applying API responses', async () => {
    let resolveReorder: (channels: GuildChannelSummary[]) => void = () => undefined
    guildApi.reorderGuildChannels.mockReturnValue(
      new Promise<GuildChannelSummary[]>((resolve) => {
        resolveReorder = resolve
      }),
    )
    const { queryClient, result } = renderReorderingHook()

    act(() => {
      result.current.mutate({
        nextChannels,
        previousChannels,
      })
    })

    await waitFor(() => {
      expect(
        queryClient
          .getQueryData<GuildChannelSummary[]>(guildChannelsQueryKey('42'))
          ?.find((item) => item.id === '43')?.parentId,
      ).toBe('45')
    })
    expect(result.current.isPending).toBe(true)

    act(() => resolveReorder(nextChannels.map((item) => ({ ...item, revision: 2 }))))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(guildApi.reorderGuildChannels).toHaveBeenCalledWith('42', [
      { channelId: '43', parentId: '45', position: 2 },
      { channelId: '46', position: 0 },
    ])
  })

  it('rolls back the optimistic order when persistence fails', async () => {
    guildApi.reorderGuildChannels.mockRejectedValue(new Error('reorder failed'))
    const { queryClient, result } = renderReorderingHook()

    act(() => {
      result.current.mutate({
        nextChannels,
        previousChannels,
      })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryData(guildChannelsQueryKey('42'))).toEqual(previousChannels)
    expect(guildApi.reorderGuildChannels).toHaveBeenCalledOnce()
  })
})

function renderReorderingHook() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  queryClient.setQueryData(guildChannelsQueryKey('42'), previousChannels)
  const view = renderHook(() => useChannelReordering('42'), {
    wrapper: ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  })
  return { queryClient, result: view.result }
}

function channel(id: string, type: number, position: number): GuildChannelSummary {
  return {
    guildId: '42',
    id,
    name: `channel-${id}`,
    position,
    revision: 1,
    topic: '',
    type,
  }
}
