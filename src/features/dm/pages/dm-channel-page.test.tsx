import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DmChannelPage as DmChannelPageData, DmChannelSummary } from '@/api/dm'
import { getReadStatesForDm } from '@/api/message'
import { DmChannelPage } from '@/features/dm/pages/dm-channel-page'
import { dmChannelsQueryKey } from '@/features/dm/dm-queries'

vi.mock('@/api/message', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/message')>()
  return {
    ...actual,
    getReadStatesForDm: vi.fn(),
    listMessages: vi.fn(),
  }
})

vi.mock('@/features/dm/components/dm-channel-view', () => ({
  DmChannelView: ({ channel }: { channel: DmChannelSummary }) => {
    const [initialChannelId] = useState(channel.channelId)
    return (
      <output data-testid="dm-channel-view">{`${initialChannelId}:${channel.channelId}`}</output>
    )
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getReadStatesForDm).mockResolvedValue({ channels: [], readStates: [] })
})

describe('DmChannelPage', () => {
  it('shows a not-found state when the channel is not in the message list', async () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData<InfiniteData<DmChannelPageData>>(dmChannelsQueryKey, {
      pageParams: [undefined],
      pages: [{ channels: [], nextCursor: undefined }],
    })
    const onBack = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <DmChannelPage channelId="43" onBack={onBack} />
      </QueryClientProvider>,
    )

    expect(
      await screen.findByRole('heading', { name: 'Conversation not found' }),
    ).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Back to messages' }))
    expect(onBack).toHaveBeenCalled()
  })

  it('remounts the message view when switching conversations', () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData<InfiniteData<DmChannelPageData>>(dmChannelsQueryKey, {
      pageParams: [undefined],
      pages: [
        {
          channels: [
            {
              channelId: '43',
              createdAt: 1_000,
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
            {
              channelId: '44',
              createdAt: 2_000,
              recipient: {
                avatarAssetId: '0',
                bio: '',
                createdAt: 1_000,
                name: 'Maya',
                updatedAt: 1_000,
                userId: '9',
                username: 'maya',
              },
            },
          ],
          nextCursor: undefined,
        },
      ],
    })

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <DmChannelPage channelId="43" />
      </QueryClientProvider>,
    )

    expect(screen.getByTestId('dm-channel-view')).toHaveTextContent('43:43')

    rerender(
      <QueryClientProvider client={queryClient}>
        <DmChannelPage channelId="44" />
      </QueryClientProvider>,
    )

    expect(screen.getByTestId('dm-channel-view')).toHaveTextContent('44:44')
  })
})

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
}
