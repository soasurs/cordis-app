import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { guildsQueryKey, type GuildSummary } from '@/features/guilds/guild-queries'
import { useJoinGuildInviteDialog } from '@/stores/join-guild-invite-dialog'

import { JoinGuildInviteDialog } from '@/features/guilds/components/join-guild-invite-dialog'

const guildApi = vi.hoisted(() => ({
  getGuildInvite: vi.fn(),
  joinGuildByInvite: vi.fn(),
}))

const navigate = vi.hoisted(() => vi.fn())

vi.mock('@/api/guild', () => guildApi)

vi.mock('@/api/assets', () => ({
  resolveGuildIconUrl: vi.fn(() => undefined),
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

const joinedGuild: GuildSummary = {
  createdAt: 1_000,
  description: 'A community for thoughtful tools.',
  iconAssetId: '0',
  id: '42',
  name: 'Cordis Studio',
  ownerId: '7',
  revision: 1,
  updatedAt: 1_000,
}

beforeEach(() => {
  vi.clearAllMocks()
  useJoinGuildInviteDialog.setState({ openState: false, pendingCode: undefined })
})

describe('JoinGuildInviteDialog', () => {
  it('previews an invite then joins and navigates into the community', async () => {
    guildApi.getGuildInvite.mockResolvedValue({
      code: 'cordis-hello',
      expiresAt: 0,
      guildDescription: 'A community for thoughtful tools.',
      guildIconAssetId: '0',
      guildId: '42',
      guildName: 'Cordis Studio',
      memberCount: 12,
    })
    guildApi.joinGuildByInvite.mockResolvedValue({
      guild: joinedGuild,
      member: {
        guildId: '42',
        joinedAt: 2_000,
        nickname: '',
        revision: 1,
        updatedAt: 2_000,
        userId: '9',
      },
    })
    const queryClient = renderDialog()
    const user = userEvent.setup()

    act(() => useJoinGuildInviteDialog.getState().open())
    expect(screen.getByRole('dialog', { name: 'Join with an invite' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByText('Enter an invite code')).toBeInTheDocument()
    expect(guildApi.getGuildInvite).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText(/Invite code/), '  cordis-hello  ')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByRole('dialog', { name: 'Join this community?' })).toBeInTheDocument()
    expect(guildApi.getGuildInvite).toHaveBeenCalledWith('cordis-hello')
    expect(screen.getByText('Cordis Studio')).toBeInTheDocument()
    expect(screen.getByText('A community for thoughtful tools.')).toBeInTheDocument()
    expect(screen.getByText(/12 members/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Join community' }))

    await waitFor(() => expect(guildApi.joinGuildByInvite).toHaveBeenCalledWith('cordis-hello'))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(queryClient.getQueryData(guildsQueryKey)).toEqual([joinedGuild])
    expect(navigate).toHaveBeenCalledWith({ params: { guildId: '42' }, to: '/guilds/$guildId' })
  })

  it('keeps the code step open with a safe preview error', async () => {
    guildApi.getGuildInvite.mockRejectedValue(new Error('private server details'))
    renderDialog()
    const user = userEvent.setup()

    act(() => useJoinGuildInviteDialog.getState().open())
    await user.type(screen.getByLabelText(/Invite code/), 'bad-code')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to find this invite. Check the code and try again.',
    )
    expect(screen.getByRole('dialog', { name: 'Join with an invite' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Invite code/)).toHaveValue('bad-code')
    expect(guildApi.joinGuildByInvite).not.toHaveBeenCalled()
  })

  it('keeps the confirm step open with a safe join error', async () => {
    guildApi.getGuildInvite.mockResolvedValue({
      code: 'cordis-hello',
      expiresAt: 0,
      guildDescription: '',
      guildIconAssetId: '0',
      guildId: '42',
      guildName: 'Cordis Studio',
      memberCount: 1,
    })
    guildApi.joinGuildByInvite.mockRejectedValue(new Error('private server details'))
    renderDialog()
    const user = userEvent.setup()

    act(() => useJoinGuildInviteDialog.getState().open())
    await user.type(screen.getByLabelText(/Invite code/), 'cordis-hello')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByRole('dialog', { name: 'Join this community?' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Join community' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to join this community. Please try again.',
    )
    expect(screen.getByRole('dialog', { name: 'Join this community?' })).toBeInTheDocument()
  })
  it('opens a pending invite code into the confirm step', async () => {
    guildApi.getGuildInvite.mockResolvedValue({
      code: 'cordis-hello',
      expiresAt: 0,
      guildDescription: 'A community for thoughtful tools.',
      guildIconAssetId: '0',
      guildId: '42',
      guildName: 'Cordis Studio',
      memberCount: 12,
    })
    renderDialog()

    act(() => useJoinGuildInviteDialog.getState().open('cordis-hello'))

    expect(await screen.findByRole('dialog', { name: 'Join this community?' })).toBeInTheDocument()
    expect(guildApi.getGuildInvite).toHaveBeenCalledWith('cordis-hello')
    expect(screen.getByText('Cordis Studio')).toBeInTheDocument()
  })
})

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <JoinGuildInviteDialog />
    </QueryClientProvider>,
  )
  return queryClient
}
