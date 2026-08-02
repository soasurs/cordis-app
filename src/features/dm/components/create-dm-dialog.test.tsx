import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createDmChannel, type DmChannelPage } from '@/api/dm'
import { lookupUser } from '@/api/relationship'
import type { PublicUserProfile } from '@/api/user'
import { CreateDmDialog } from '@/features/dm/components/create-dm-dialog'
import { dmChannelsQueryKey, flattenDmChannels } from '@/features/dm/dm-queries'

const navigate = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

vi.mock('@/api/dm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/dm')>()
  return {
    ...actual,
    createDmChannel: vi.fn(),
  }
})

vi.mock('@/api/relationship', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/relationship')>()
  return {
    ...actual,
    lookupUser: vi.fn(),
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

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CreateDmDialog', () => {
  it('looks up a username, creates the channel, and navigates to it', async () => {
    vi.mocked(lookupUser).mockResolvedValue(profile)
    vi.mocked(createDmChannel).mockResolvedValue({
      channelId: '43',
      createdAt: 2_000,
      recipient: profile,
    })
    const { onClose, queryClient } = renderDialog()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Username'), 'alex')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(await screen.findByText('Alex Chen')).toBeInTheDocument()
    expect(lookupUser).toHaveBeenCalledWith('alex')

    await user.click(screen.getByRole('button', { name: 'Message' }))

    await vi.waitFor(() => expect(createDmChannel).toHaveBeenCalledWith('8'))
    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        params: { channelId: '43' },
        to: '/dm/$channelId',
      }),
    )
    expect(onClose).toHaveBeenCalled()
    expect(
      flattenDmChannels(
        queryClient.getQueryData<InfiniteData<DmChannelPage>>(dmChannelsQueryKey),
      ).map((channel) => channel.channelId),
    ).toEqual(['43'])
  })

  it('shows a safe create error and stays open', async () => {
    vi.mocked(lookupUser).mockResolvedValue(profile)
    vi.mocked(createDmChannel).mockRejectedValue(new Error('private relationship details'))
    const { onClose } = renderDialog()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Username'), 'alex')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    await screen.findByText('Alex Chen')
    await user.click(screen.getByRole('button', { name: 'Message' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to start this conversation. Please try again.',
    )
    expect(onClose).not.toHaveBeenCalled()
  })

  it('starts from a known profile without the lookup step', async () => {
    vi.mocked(createDmChannel).mockResolvedValue({
      channelId: '43',
      createdAt: 2_000,
      recipient: profile,
    })
    renderDialog(profile)

    expect(screen.getByText('Alex Chen')).toBeInTheDocument()
    expect(screen.queryByLabelText('Username')).not.toBeInTheDocument()

    await userEvent.setup().click(screen.getByRole('button', { name: 'Message' }))
    await vi.waitFor(() => expect(createDmChannel).toHaveBeenCalledWith('8'))
  })
})

function renderDialog(profile?: PublicUserProfile) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  // The sidebar/list mounts the DM query whenever personal pages are open.
  queryClient.setQueryData(dmChannelsQueryKey, {
    pageParams: [undefined],
    pages: [{ channels: [], nextCursor: undefined }],
  })
  const onClose = vi.fn()
  render(
    <QueryClientProvider client={queryClient}>
      <CreateDmDialog open profile={profile} onClose={onClose} />
    </QueryClientProvider>,
  )
  return { onClose, queryClient }
}
