import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authSessionQueryKey } from '@/features/auth/auth-session'

import {
  guildChannelsQueryKey,
  guildsQueryKey,
  type GuildChannelSummary,
  type GuildSummary,
} from '../guild-queries'

import { GuildPage } from './guild-page'

const guildApi = vi.hoisted(() => ({
  createGuildChannel: vi.fn(),
  listGuildChannels: vi.fn(),
}))

vi.mock('@/api/guild', () => guildApi)

const guild: GuildSummary = {
  createdAt: 1_000,
  iconAssetId: '0',
  id: '42',
  name: 'Cordis Studio',
  ownerId: '7',
  revision: 1,
  updatedAt: 1_000,
}

const channels: GuildChannelSummary[] = [
  {
    guildId: '42',
    id: '43',
    name: 'general',
    position: 0,
    revision: 1,
    topic: 'The shared room for the community',
    type: 1,
  },
  {
    guildId: '42',
    id: '44',
    name: 'Lounge',
    position: 1,
    revision: 1,
    topic: '',
    type: 3,
  },
  {
    guildId: '42',
    id: '45',
    name: 'Projects',
    position: 2,
    revision: 1,
    topic: '',
    type: 2,
  },
  {
    guildId: '42',
    id: '46',
    name: 'design',
    parentId: '45',
    position: 0,
    revision: 1,
    topic: '',
    type: 1,
  },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GuildPage', () => {
  it('loads channels from the API when the local channel list is missing', async () => {
    guildApi.listGuildChannels.mockResolvedValue(channels)
    renderGuildPage(createQueryClient(), { channelId: '43' })

    expect(await screen.findByRole('heading', { name: 'Welcome to #general' })).toBeInTheDocument()
    expect(screen.getAllByRole('navigation', { name: 'Community channels' })).toHaveLength(2)
    expect(guildApi.listGuildChannels).toHaveBeenCalledOnce()
    expect(guildApi.listGuildChannels.mock.calls[0]?.[0]).toBe('42')
  })

  it('uses a channel list already supplied by READY without another API call', async () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData(guildChannelsQueryKey('42'), channels)
    renderGuildPage(queryClient, { channelId: '43' })

    expect(await screen.findByRole('heading', { name: 'Welcome to #general' })).toBeInTheDocument()
    expect(guildApi.listGuildChannels).not.toHaveBeenCalled()
  })

  it('renders channels without a parent directly instead of adding type groups', async () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData(guildChannelsQueryKey('42'), channels)
    renderGuildPage(queryClient, { channelId: '43', onSelectChannel: vi.fn() })

    expect(await screen.findAllByRole('button', { name: 'general' })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'Lounge' })).toHaveLength(2)
    expect(screen.queryByText('Text channels')).not.toBeInTheDocument()
    expect(screen.queryByText('Voice channels')).not.toBeInTheDocument()
    expect(screen.queryByText('Move to top level')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Move general' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Move Projects' })).not.toBeInTheDocument()
  })

  it('requests navigation when another channel is selected', async () => {
    const queryClient = createQueryClient()
    const onSelectChannel = vi.fn()
    queryClient.setQueryData(guildChannelsQueryKey('42'), channels)
    renderGuildPage(queryClient, { channelId: '43', onSelectChannel })

    const loungeButtons = await screen.findAllByRole('button', { name: 'Lounge' })
    fireEvent.click(loungeButtons[0]!)
    expect(onSelectChannel).toHaveBeenCalledWith('44')
  })

  it('shows the known empty state without repeatedly loading channels', async () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData(guildChannelsQueryKey('42'), [])
    renderGuildPage(queryClient)

    expect(await screen.findByRole('heading', { name: 'No channels yet' })).toBeInTheDocument()
    expect(guildApi.listGuildChannels).not.toHaveBeenCalled()
  })

  it('expands and collapses category channels', async () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData(guildChannelsQueryKey('42'), channels)
    renderGuildPage(queryClient, { channelId: '43', onSelectChannel: vi.fn() })

    const categoryButtons = await screen.findAllByRole('button', { name: 'Projects' })
    expect(categoryButtons[0]).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('button', { name: 'design' })).toHaveLength(2)

    fireEvent.click(categoryButtons[0]!)

    expect(categoryButtons[0]).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: 'design' })).not.toBeInTheDocument()
  })

  it('creates only text or voice channels inside a category and selects the result', async () => {
    const queryClient = createQueryClient()
    const onSelectChannel = vi.fn()
    const createdChannel: GuildChannelSummary = {
      guildId: '42',
      id: '47',
      name: 'standup',
      parentId: '45',
      position: 1,
      revision: 1,
      topic: '',
      type: 3,
    }
    guildApi.createGuildChannel.mockResolvedValue(createdChannel)
    queryClient.setQueryData(guildChannelsQueryKey('42'), channels)
    renderGuildPage(queryClient, { channelId: '43', onSelectChannel })
    const user = userEvent.setup()

    const createButtons = await screen.findAllByRole('button', {
      name: 'Create a channel in Projects',
    })
    await user.click(createButtons[0]!)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Text channel' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Voice channel' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /category/i })).not.toBeInTheDocument()

    await user.type(screen.getByLabelText(/^Channel name/), 'standup')
    await user.selectOptions(screen.getByRole('combobox', { name: /Channel type/ }), 'voice')
    await user.click(screen.getByRole('button', { name: 'Create channel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(guildApi.createGuildChannel).toHaveBeenCalledWith({
      guildId: '42',
      name: 'standup',
      parentId: '45',
      type: 'voice',
    })
    expect(queryClient.getQueryData(guildChannelsQueryKey('42'))).toContainEqual(createdChannel)
    expect(onSelectChannel).toHaveBeenCalledWith('47')
  })

  it('creates and selects a top-level channel from the community menu', async () => {
    const queryClient = createQueryClient()
    const onSelectChannel = vi.fn()
    const createdChannel: GuildChannelSummary = {
      guildId: '42',
      id: '48',
      name: 'announcements',
      position: 3,
      revision: 1,
      topic: '',
      type: 1,
    }
    guildApi.createGuildChannel.mockResolvedValue(createdChannel)
    queryClient.setQueryData(guildChannelsQueryKey('42'), channels)
    renderGuildPage(queryClient, { channelId: '43', onSelectChannel })
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Community menu' }))
    await user.click(screen.getByRole('menuitem', { name: 'Create channel' }))

    expect(screen.getByText('This channel will not belong to a category.')).toBeInTheDocument()
    await user.type(screen.getByLabelText(/^Channel name/), 'announcements')
    await user.click(screen.getByRole('button', { name: 'Create channel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(guildApi.createGuildChannel).toHaveBeenCalledWith({
      guildId: '42',
      name: 'announcements',
      parentId: undefined,
      type: 'text',
    })
    expect(queryClient.getQueryData(guildChannelsQueryKey('42'))).toContainEqual(createdChannel)
    expect(onSelectChannel).toHaveBeenCalledWith('48')
  })

  it('opens community settings from the community menu for the owner', async () => {
    const queryClient = createQueryClient()
    const onOpenSettings = vi.fn()
    queryClient.setQueryData(guildChannelsQueryKey('42'), channels)
    renderGuildPage(queryClient, { channelId: '43', onOpenSettings })
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Community menu' }))
    await user.click(screen.getByRole('menuitem', { name: 'Community settings' }))

    expect(onOpenSettings).toHaveBeenCalledOnce()
  })

  it('opens community settings from the mobile channel navigation for the owner', async () => {
    const queryClient = createQueryClient()
    const onOpenSettings = vi.fn()
    queryClient.setQueryData(guildChannelsQueryKey('42'), channels)
    renderGuildPage(queryClient, { channelId: '43', onOpenSettings })
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Open community settings' }))

    expect(onOpenSettings).toHaveBeenCalledOnce()
  })

  it('creates a top-level category from the community menu without selecting it', async () => {
    const queryClient = createQueryClient()
    const onSelectChannel = vi.fn()
    const createdCategory: GuildChannelSummary = {
      guildId: '42',
      id: '49',
      name: 'Announcements',
      position: 3,
      revision: 1,
      topic: '',
      type: 2,
    }
    guildApi.createGuildChannel.mockResolvedValue(createdCategory)
    queryClient.setQueryData(guildChannelsQueryKey('42'), channels)
    renderGuildPage(queryClient, { channelId: '43', onSelectChannel })
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Community menu' }))
    await user.click(screen.getByRole('menuitem', { name: 'Create category' }))

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText(/^Category name/), 'Announcements')
    await user.click(screen.getByRole('button', { name: 'Create category' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(guildApi.createGuildChannel).toHaveBeenCalledWith({
      guildId: '42',
      name: 'Announcements',
      type: 'category',
    })
    expect(queryClient.getQueryData(guildChannelsQueryKey('42'))).toContainEqual(createdCategory)
    expect(onSelectChannel).not.toHaveBeenCalled()
  })
})

function createQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  queryClient.setQueryData(authSessionQueryKey, {
    profile: { name: 'Alex Chen', username: 'alex_chen' },
    user: { email: 'alex@example.com', userId: 7n },
  })
  queryClient.setQueryData(guildsQueryKey, [guild])
  return queryClient
}

function renderGuildPage(
  queryClient: QueryClient,
  props: {
    channelId?: string
    onOpenSettings?: () => void
    onSelectChannel?: (channelId: string) => void
  } = {},
) {
  render(
    <QueryClientProvider client={queryClient}>
      <GuildPage guildId="42" {...props} />
    </QueryClientProvider>,
  )
}
