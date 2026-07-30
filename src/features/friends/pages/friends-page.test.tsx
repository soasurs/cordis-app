import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  listRelationships,
  type RelationshipSummary,
  type RelationshipType,
} from '@/api/relationship'
import { FriendsPage } from '@/features/friends/pages/friends-page'

vi.mock('@/api/relationship', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/relationship')>()
  return {
    ...original,
    listRelationships: vi.fn(),
  }
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('FriendsPage', () => {
  it('renders the friend list', async () => {
    vi.mocked(listRelationships).mockResolvedValue({
      relationships: [createRelationship('friend', '8', 'Alex Chen', 'alex')],
    })

    renderFriendsPage('all')

    expect(await screen.findByText('Alex Chen')).toBeInTheDocument()
    expect(screen.getByText('@alex')).toBeInTheDocument()
    expect(screen.getByText('Friend')).toBeInTheDocument()
    expect(listRelationships).toHaveBeenCalledWith('friend', undefined)
  })

  it('separates incoming and sent requests', async () => {
    vi.mocked(listRelationships).mockImplementation(async (type) => ({
      relationships:
        type === 'incoming'
          ? [createRelationship('incoming', '8', 'Alex Chen', 'alex')]
          : type === 'outgoing'
            ? [createRelationship('outgoing', '9', 'Blair Stone', 'blair')]
            : [],
    }))

    renderFriendsPage('pending')

    expect(await screen.findByRole('heading', { name: 'Incoming requests' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sent requests' })).toBeInTheDocument()
    expect(screen.getByText('@alex')).toBeInTheDocument()
    expect(screen.getByText('@blair')).toBeInTheDocument()
    expect(listRelationships).toHaveBeenCalledWith('incoming', undefined)
    expect(listRelationships).toHaveBeenCalledWith('outgoing', undefined)
  })

  it('renders the blocked empty state', async () => {
    vi.mocked(listRelationships).mockResolvedValue({ relationships: [] })

    renderFriendsPage('blocked')

    expect(await screen.findByRole('heading', { name: 'No blocked users' })).toBeInTheDocument()
    expect(screen.getByText('People you block will appear here.')).toBeInTheDocument()
  })

  it('renders a loading state while the active list is pending', () => {
    vi.mocked(listRelationships).mockReturnValue(new Promise(() => {}))

    renderFriendsPage('all')

    expect(screen.getByRole('status')).toHaveTextContent('Loading relationships…')
  })

  it('retries a failed relationship list', async () => {
    vi.mocked(listRelationships)
      .mockRejectedValueOnce(new Error('network failed'))
      .mockResolvedValueOnce({ relationships: [] })

    renderFriendsPage('all')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load relationships. Please try again.',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { name: 'No friends yet' })).toBeInTheDocument()
    expect(listRelationships).toHaveBeenCalledTimes(2)
  })

  it('loads the next opaque relationship page', async () => {
    vi.mocked(listRelationships).mockImplementation(async (_type, cursor) =>
      cursor
        ? {
            relationships: [createRelationship('friend', '9', 'Blair Stone', 'blair')],
          }
        : {
            nextCursor: 'opaque-next',
            relationships: [createRelationship('friend', '8', 'Alex Chen', 'alex')],
          },
    )

    renderFriendsPage('all')

    expect(await screen.findByText('@alex')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }))

    expect(await screen.findByText('@blair')).toBeInTheDocument()
    await waitFor(() => expect(listRelationships).toHaveBeenLastCalledWith('friend', 'opaque-next'))
  })

  it('reports tab selection without changing data locally', () => {
    vi.mocked(listRelationships).mockResolvedValue({ relationships: [] })
    const onSelectTab = vi.fn()

    renderFriendsPage('all', onSelectTab)
    fireEvent.click(screen.getByRole('button', { name: 'Pending' }))

    expect(onSelectTab).toHaveBeenCalledWith('pending')
  })

  it('opens and closes the add friend dialog', () => {
    vi.mocked(listRelationships).mockResolvedValue({ relationships: [] })

    renderFriendsPage('all')
    fireEvent.click(screen.getByRole('button', { name: 'Add friend' }))

    expect(screen.getByRole('dialog', { name: 'Add a friend' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close add friend dialog' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

function renderFriendsPage(tab: 'all' | 'blocked' | 'pending', onSelectTab = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <FriendsPage onSelectTab={onSelectTab} tab={tab} />
    </QueryClientProvider>,
  )
}

function createRelationship(
  type: RelationshipType,
  targetId: string,
  name: string,
  username: string,
): RelationshipSummary {
  return {
    createdAt: 2_000,
    profile: {
      avatarAssetId: '0',
      bio: '',
      createdAt: 1_000,
      name,
      updatedAt: 1_000,
      userId: targetId,
      username,
    },
    targetId,
    type,
    updatedAt: 2_000,
  }
}
