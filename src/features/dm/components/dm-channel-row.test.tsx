import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { DmChannelSummary } from '@/api/dm'
import { DmChannelRow } from '@/features/dm/components/dm-channel-row'
import { presenceQueryKey, type PresenceCache } from '@/features/presence/presence-queries'

const channel: DmChannelSummary = {
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
}

describe('DmChannelRow', () => {
  it('renders the recipient, presence, unread dot, and mention badge', () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData<PresenceCache>(
      presenceQueryKey,
      new Map([
        [
          '8',
          {
            lastSeenAt: 1_500,
            status: 'online',
            userId: '8',
            version: 2n,
          },
        ],
      ]),
    )
    const readState = {
      channelId: '43',
      lastMessageId: '200',
      lastReadMessageId: '150',
      mentionCount: 3,
    }

    render(
      <QueryClientProvider client={queryClient}>
        <DmChannelRow channel={channel} readState={readState} />
      </QueryClientProvider>,
    )

    expect(screen.getByRole('button', { name: /Alex Chen/ })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'online presence' })).toBeInTheDocument()
    expect(screen.getByLabelText('Unread messages')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('highlights the selected conversation and calls onSelect', () => {
    const onSelect = vi.fn()
    const queryClient = createQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <DmChannelRow active channel={channel} onSelect={onSelect} />
      </QueryClientProvider>,
    )

    const row = screen.getByRole('button', { name: /Alex Chen/ })
    expect(row).toHaveAttribute('aria-current', 'page')
    row.click()
    expect(onSelect).toHaveBeenCalledWith('43')
  })
})

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
}
