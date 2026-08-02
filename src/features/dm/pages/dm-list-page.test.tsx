import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DmChannelPage } from '@/api/dm'
import { getReadStatesForDm } from '@/api/message'
import { DmListPage } from '@/features/dm/pages/dm-list-page'
import { dmChannelsQueryKey } from '@/features/dm/dm-queries'
import { channelReadStatesQueryKey } from '@/features/messages/read-state-queries'

vi.mock('@/api/message', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/message')>()
  return {
    ...actual,
    getReadStatesForDm: vi.fn(),
  }
})

const page: DmChannelPage = {
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
        username: 'alex',
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
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getReadStatesForDm).mockResolvedValue([])
})

describe('DmListPage', () => {
  it('renders conversations with read-state markers and navigates on select', async () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData<InfiniteData<DmChannelPage>>(dmChannelsQueryKey, {
      pageParams: [undefined],
      pages: [page],
    })
    queryClient.setQueryData(channelReadStatesQueryKey(), {
      '43': {
        channelId: '43',
        lastMessageId: '200',
        lastReadMessageId: '150',
        mentionCount: 2,
      },
    })
    const onSelectChannel = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <DmListPage onSelectChannel={onSelectChannel} />
      </QueryClientProvider>,
    )

    expect(await screen.findByRole('heading', { level: 1, name: 'Messages' })).toBeInTheDocument()
    expect(screen.getByText('Alex Chen')).toBeInTheDocument()
    expect(screen.getByText('Maya')).toBeInTheDocument()
    expect(screen.getByLabelText('Unread messages')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()

    await userEvent.setup().click(screen.getByRole('button', { name: /Maya/ }))
    expect(onSelectChannel).toHaveBeenCalledWith('44')
  })

  it('shows the empty state when there are no conversations', async () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData<InfiniteData<DmChannelPage>>(dmChannelsQueryKey, {
      pageParams: [undefined],
      pages: [{ channels: [], nextCursor: undefined }],
    })

    render(
      <QueryClientProvider client={queryClient}>
        <DmListPage onSelectChannel={vi.fn()} />
      </QueryClientProvider>,
    )

    expect(
      await screen.findByRole('heading', { level: 2, name: 'No conversations yet' }),
    ).toBeInTheDocument()
  })
})

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
}
