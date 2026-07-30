import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  acceptFriendRequest,
  blockUser,
  declineFriendRequest,
  removeFriend,
  unblockUser,
  type RelationshipSummary,
  type RelationshipType,
} from '@/api/relationship'
import { FriendRelationshipRow } from '@/features/friends/components/friend-relationship-row'

vi.mock('@/api/relationship', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/relationship')>()
  return {
    ...original,
    acceptFriendRequest: vi.fn(),
    blockUser: vi.fn(),
    declineFriendRequest: vi.fn(),
    removeFriend: vi.fn(),
    unblockUser: vi.fn(),
  }
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('FriendRelationshipRow', () => {
  it('accepts or declines an incoming request', async () => {
    vi.mocked(acceptFriendRequest).mockResolvedValue(createRelationship('friend'))
    vi.mocked(declineFriendRequest).mockResolvedValue()
    const user = userEvent.setup()
    const { rerender, wrapper } = renderRelationship('incoming')

    await user.click(screen.getByRole('button', { name: 'Accept' }))
    await waitFor(() => expect(acceptFriendRequest).toHaveBeenCalledWith('8'))

    rerender(wrapper(<FriendRelationshipRow relationship={createRelationship('incoming')} />))
    await user.click(screen.getByRole('button', { name: 'Decline' }))
    await waitFor(() => expect(declineFriendRequest).toHaveBeenCalledWith('8'))
  })

  it('cancels an outgoing request', async () => {
    vi.mocked(removeFriend).mockResolvedValue()
    renderRelationship('outgoing')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Cancel request' }))

    await waitFor(() => expect(removeFriend).toHaveBeenCalledWith('8'))
  })

  it('requires confirmation before removing a friend', async () => {
    vi.mocked(removeFriend).mockResolvedValue()
    renderRelationship('friend')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Remove friend' }))
    expect(removeFriend).not.toHaveBeenCalled()
    expect(screen.getByText('Remove Alex Chen from friends?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirm remove' }))
    await waitFor(() => expect(removeFriend).toHaveBeenCalledWith('8'))
  })

  it('requires confirmation before blocking a friend', async () => {
    vi.mocked(blockUser).mockResolvedValue(createRelationship('blocked'))
    renderRelationship('friend')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Block' }))
    expect(blockUser).not.toHaveBeenCalled()
    expect(screen.getByText('Block Alex Chen?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirm block' }))
    await waitFor(() => expect(blockUser).toHaveBeenCalledWith('8'))
  })

  it('unblocks a blocked user', async () => {
    vi.mocked(unblockUser).mockResolvedValue()
    renderRelationship('blocked')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Unblock' }))

    await waitFor(() => expect(unblockUser).toHaveBeenCalledWith('8'))
  })

  it('keeps the relationship visible and shows a safe mutation error', async () => {
    vi.mocked(removeFriend).mockRejectedValue(new Error('private removal details'))
    renderRelationship('outgoing')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Cancel request' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to remove this relationship. Please try again.',
    )
    expect(screen.getByText('Alex Chen')).toBeInTheDocument()
  })
})

function renderRelationship(type: RelationshipType) {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })
  const wrapper = (children: React.ReactNode) => (
    <QueryClientProvider client={queryClient}>
      <ul>{children}</ul>
    </QueryClientProvider>
  )

  return {
    ...render(wrapper(<FriendRelationshipRow relationship={createRelationship(type)} />)),
    wrapper,
  }
}

function createRelationship(type: RelationshipType): RelationshipSummary {
  return {
    createdAt: 2_000,
    profile: {
      avatarAssetId: '0',
      bio: '',
      createdAt: 1_000,
      name: 'Alex Chen',
      updatedAt: 1_000,
      userId: '8',
      username: 'alex',
    },
    targetId: '8',
    type,
    updatedAt: 2_000,
  }
}
