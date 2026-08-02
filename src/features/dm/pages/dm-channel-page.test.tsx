import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DmChannelPage as DmChannelPageData } from '@/api/dm'
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

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getReadStatesForDm).mockResolvedValue([])
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
})

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
}
