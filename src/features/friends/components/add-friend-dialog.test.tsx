import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  lookupUser,
  sendFriendRequest,
  type RelationshipPage,
  type RelationshipSummary,
} from '@/api/relationship'
import type { PublicUserProfile } from '@/api/user'
import { AddFriendDialog } from '@/features/friends/components/add-friend-dialog'
import {
  flattenRelationships,
  relationshipListQueryKey,
} from '@/features/friends/relationship-queries'

vi.mock('@/api/relationship', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/relationship')>()
  return {
    ...original,
    lookupUser: vi.fn(),
    sendFriendRequest: vi.fn(),
  }
})

const profile: PublicUserProfile = {
  avatarAssetId: '0',
  bio: '',
  createdAt: 1_000,
  name: 'Alex Chen',
  updatedAt: 1_000,
  userId: '8',
  username: 'alex',
}

const outgoingRelationship: RelationshipSummary = {
  createdAt: 2_000,
  profile,
  targetId: '8',
  type: 'outgoing',
  updatedAt: 2_000,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AddFriendDialog', () => {
  it('looks up an exact username and sends a friend request', async () => {
    vi.mocked(lookupUser).mockResolvedValue(profile)
    vi.mocked(sendFriendRequest).mockResolvedValue(outgoingRelationship)
    const { queryClient } = renderDialog()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Username'), '  alex  ')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(await screen.findByText('Alex Chen')).toBeInTheDocument()
    expect(lookupUser).toHaveBeenCalledWith('alex')

    await user.click(screen.getByRole('button', { name: 'Send friend request' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Request sent')
    expect(sendFriendRequest).toHaveBeenCalledWith('8')
    expect(
      flattenRelationships(
        queryClient.getQueryData<InfiniteData<RelationshipPage>>(
          relationshipListQueryKey('outgoing'),
        ),
      ),
    ).toEqual([outgoingRelationship])
  })

  it('keeps the dialog open with a safe lookup error', async () => {
    vi.mocked(lookupUser).mockRejectedValue(new Error('private lookup details'))
    const { onClose } = renderDialog()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Username'), 'missing')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(
      await screen.findByText('Unable to find that user. Check the username and try again.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('keeps the lookup result available when sending fails', async () => {
    vi.mocked(lookupUser).mockResolvedValue(profile)
    vi.mocked(sendFriendRequest).mockRejectedValue(new Error('private send details'))
    renderDialog()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Username'), 'alex')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    await user.click(await screen.findByRole('button', { name: 'Send friend request' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to send this friend request. Please try again.',
    )
    expect(screen.getByText('Alex Chen')).toBeInTheDocument()
  })
})

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })
  queryClient.setQueryData<InfiniteData<RelationshipPage>>(relationshipListQueryKey('outgoing'), {
    pageParams: [undefined],
    pages: [{ relationships: [] }],
  })
  const onClose = vi.fn()

  render(
    <QueryClientProvider client={queryClient}>
      <AddFriendDialog onClose={onClose} />
    </QueryClientProvider>,
  )

  return { onClose, queryClient }
}
