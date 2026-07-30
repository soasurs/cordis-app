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
} from '@/features/guilds/guild-queries'

import { GuildPage } from '@/features/guilds/pages/guild-page'

const guildApi = vi.hoisted(() => ({
  createGuildChannel: vi.fn(),
  GuildChannelType: {
    CATEGORY: 2,
    TEXT: 1,
    VOICE: 3,
  },
  guildPermission: {
    administrator: '1',
    banMembers: '512',
    createInvite: '1024',
    kickMembers: '16',
    manageChannels: '128',
    manageGuild: '2',
    manageMembers: '8',
    manageMessages: '256',
    manageRoles: '4',
    sendMessages: '64',
    viewChannel: '32',
  },
  listGuildChannels: vi.fn(),
  listGuildMemberRoles: vi.fn(),
  listGuildRoles: vi.fn(),
}))

const messageApi = vi.hoisted(() => ({
  ackMessage: vi.fn(),
  createMessage: vi.fn(),
  deleteMessage: vi.fn(),
  getReadStatesForGuild: vi.fn(),
  listMessages: vi.fn(),
  MessageType: { DEFAULT: 1 },
  updateMessage: vi.fn(),
}))

vi.mock('@/api/guild', () => guildApi)
vi.mock('@/api/message', () => messageApi)

const guild: GuildSummary = {
  createdAt: 1_000,
  description: '',
  iconAssetId: '0',
  id: '42',
  name: 'Cordis Studio',
  ownerId: '7',
  revision: 1,
  updatedAt: 1_000,
}

const everyoneRole = {
  createdAt: 1_000,
  guildId: '42',
  id: '42',
  isDefault: true,
  name: '@everyone',
  permissions: '128',
  position: 0,
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
  guildApi.listGuildRoles.mockResolvedValue([everyoneRole])
  guildApi.listGuildMemberRoles.mockResolvedValue([])
  messageApi.ackMessage.mockResolvedValue({
    channelId: '43',
    lastMessageId: '200',
    lastReadMessageId: '200',
    mentionCount: 0,
  })
  messageApi.getReadStatesForGuild.mockResolvedValue([])
  messageApi.listMessages.mockResolvedValue({ messages: [] })
})

describe('GuildPage', () => {
  it('keeps the current-user panel at the bottom of the community sidebar', async () => {
    const queryClient = createQueryClient()
    const onOpenUserSettings = vi.fn()
    queryClient.setQueryData(guildChannelsQueryKey('42'), channels)
    renderGuildPage(queryClient, { channelId: '43', onOpenUserSettings })

    expect(await screen.findByText('@alex_chen')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'User settings' }))
    expect(onOpenUserSettings).toHaveBeenCalledOnce()
  })

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

  it('renders loaded channel messages through the virtual timeline', async () => {
    const offsetHeight = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(600)
    const offsetWidth = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(1_000)
    messageApi.listMessages.mockResolvedValue({
      messages: [
        {
          attachments: [],
          author: {
            avatarAssetId: '0',
            bio: '',
            createdAt: 1_000,
            name: 'Alex Chen',
            updatedAt: 1_000,
            userId: '7',
            username: 'alex_chen',
          },
          channelId: '43',
          content: 'Newest virtual message',
          createdAt: 3_000,
          editedAt: 0,
          flags: 0,
          id: '103',
          revision: 1,
          type: 1,
          updatedAt: 3_000,
        },
        {
          attachments: [],
          author: {
            avatarAssetId: '0',
            bio: '',
            createdAt: 1_000,
            name: 'Alex Chen',
            updatedAt: 1_000,
            userId: '7',
            username: 'alex_chen',
          },
          channelId: '43',
          content: 'Older virtual message',
          createdAt: 2_000,
          editedAt: 0,
          flags: 0,
          id: '102',
          revision: 1,
          type: 1,
          updatedAt: 2_000,
        },
      ],
    })
    const queryClient = createQueryClient()
    queryClient.setQueryData(guildChannelsQueryKey('42'), channels)

    try {
      renderGuildPage(queryClient, { channelId: '43' })

      expect(await screen.findByText('Older virtual message')).toBeInTheDocument()
      expect(screen.getByText('Newest virtual message')).toBeInTheDocument()
      expect(screen.getByLabelText('Messages in #general')).toHaveClass('relative')
    } finally {
      offsetHeight.mockRestore()
      offsetWidth.mockRestore()
    }
  })

  it('mounts only a window of a long channel timeline', async () => {
    const offsetHeight = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(600)
    const offsetWidth = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(1_000)
    messageApi.listMessages.mockResolvedValue({
      messages: Array.from({ length: 100 }, (_, index) => ({
        attachments: [],
        author: {
          avatarAssetId: '0',
          bio: '',
          createdAt: 1_000,
          name: 'Alex Chen',
          updatedAt: 1_000,
          userId: '7',
          username: 'alex_chen',
        },
        channelId: '43',
        content: `Virtual message ${100 - index}`,
        createdAt: 10_000 - index,
        editedAt: 0,
        flags: 0,
        id: `${200 - index}`,
        revision: 1,
        type: 1,
        updatedAt: 10_000 - index,
      })),
    })
    const queryClient = createQueryClient()
    queryClient.setQueryData(guildChannelsQueryKey('42'), channels)

    try {
      renderGuildPage(queryClient, { channelId: '43' })

      await screen.findByText('Virtual message 1')
      await waitFor(() => {
        const mountedMessages = screen.getAllByRole('article')
        expect(mountedMessages.length).toBeGreaterThan(0)
        expect(mountedMessages.length).toBeLessThan(100)
      })
    } finally {
      offsetHeight.mockRestore()
      offsetWidth.mockRestore()
    }
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

  it('leaves the channel list empty when there are no visible channels', async () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData(guildChannelsQueryKey('42'), [])
    renderGuildPage(queryClient)

    expect(await screen.findByRole('button', { name: 'Community menu' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'No channels yet' })).not.toBeInTheDocument()
    expect(screen.queryByText('No channels available')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Community channels' })).not.toBeInTheDocument()
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

    await user.click(await screen.findByRole('button', { name: 'Community menu' }))
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

    await user.click(await screen.findByRole('button', { name: 'Community menu' }))
    await user.click(screen.getByRole('menuitem', { name: 'Community settings' }))

    expect(onOpenSettings).toHaveBeenCalledOnce()
  })

  it('opens community settings from the mobile channel navigation for the owner', async () => {
    const queryClient = createQueryClient()
    const onOpenSettings = vi.fn()
    queryClient.setQueryData(guildChannelsQueryKey('42'), channels)
    renderGuildPage(queryClient, { channelId: '43', onOpenSettings })
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Open community settings' }))

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

    await user.click(await screen.findByRole('button', { name: 'Community menu' }))
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

  it('keeps channel create actions for the owner even without Manage Channels on roles', async () => {
    guildApi.listGuildRoles.mockResolvedValue([
      {
        ...everyoneRole,
        permissions: '32',
      },
    ])
    const queryClient = createQueryClient()
    queryClient.setQueryData(guildChannelsQueryKey('42'), channels)
    renderGuildPage(queryClient, { channelId: '43', onOpenSettings: vi.fn() })
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Community menu' }))
    expect(screen.getByRole('menuitem', { name: 'Create channel' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Create category' })).toBeInTheDocument()
  })

  it('shows community settings for a non-owner with Manage community', async () => {
    guildApi.listGuildRoles.mockResolvedValue([
      {
        ...everyoneRole,
        permissions: '2',
      },
    ])
    const onOpenSettings = vi.fn()
    const queryClient = createQueryClient()
    queryClient.setQueryData(guildsQueryKey, [{ ...guild, ownerId: '99' }])
    queryClient.setQueryData(guildChannelsQueryKey('42'), channels)
    renderGuildPage(queryClient, { channelId: '43', onOpenSettings })
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Community menu' }))
    expect(screen.getByRole('menuitem', { name: 'Community settings' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Create channel' })).not.toBeInTheDocument()
  })

  it('hides channel create actions when a non-owner lacks Manage Channels', async () => {
    guildApi.listGuildRoles.mockResolvedValue([
      {
        ...everyoneRole,
        permissions: '32',
      },
    ])
    const queryClient = createQueryClient()
    queryClient.setQueryData(guildsQueryKey, [{ ...guild, ownerId: '99' }])
    queryClient.setQueryData(guildChannelsQueryKey('42'), channels)
    renderGuildPage(queryClient, { channelId: '43', onOpenSettings: vi.fn() })

    expect(await screen.findByRole('heading', { name: 'Welcome to #general' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Community menu' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Create a channel in Projects' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open channel settings' })).not.toBeInTheDocument()
  })

  it('shows a settings gear on channel and category rows when Manage Channels is available', async () => {
    const queryClient = createQueryClient()
    const onOpenChannelSettings = vi.fn()
    queryClient.setQueryData(guildChannelsQueryKey('42'), channels)
    renderGuildPage(queryClient, { channelId: '43', onOpenChannelSettings })
    const user = userEvent.setup()

    const channelGear = await screen.findAllByRole('button', { name: 'Open channel settings' })
    expect(channelGear.length).toBeGreaterThan(0)
    await user.click(channelGear[0]!)
    expect(onOpenChannelSettings).toHaveBeenCalledWith(
      expect.objectContaining({ id: expect.any(String), type: expect.any(Number) }),
    )

    onOpenChannelSettings.mockClear()
    const categoryGear = screen.getAllByRole('button', { name: 'Open category settings' })
    expect(categoryGear.length).toBeGreaterThan(0)
    await user.click(categoryGear[0]!)
    expect(onOpenChannelSettings).toHaveBeenCalledWith(
      expect.objectContaining({ id: '45', name: 'Projects', type: 2 }),
    )
  })

  it('hides the settings gear when a non-owner lacks Manage Channels', async () => {
    guildApi.listGuildRoles.mockResolvedValue([
      {
        ...everyoneRole,
        permissions: '32',
      },
    ])
    const queryClient = createQueryClient()
    queryClient.setQueryData(guildsQueryKey, [{ ...guild, ownerId: '99' }])
    queryClient.setQueryData(guildChannelsQueryKey('42'), channels)
    renderGuildPage(queryClient, {
      channelId: '43',
      onOpenChannelSettings: vi.fn(),
    })

    expect(await screen.findByRole('heading', { name: 'Welcome to #general' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open channel settings' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open category settings' })).not.toBeInTheDocument()
  })

  it('disables the composer when the member lacks Send Messages', async () => {
    guildApi.listGuildRoles.mockResolvedValue([
      {
        ...everyoneRole,
        permissions: '32',
      },
    ])
    const queryClient = createQueryClient()
    queryClient.setQueryData(guildsQueryKey, [{ ...guild, ownerId: '99' }])
    queryClient.setQueryData(guildChannelsQueryKey('42'), channels)
    renderGuildPage(queryClient, { channelId: '43' })

    expect(
      await screen.findByText('You do not have permission to send messages in #general.'),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Message #general')).not.toBeInTheDocument()
  })

  it('keeps the voice channel welcome stub', async () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData(guildChannelsQueryKey('42'), channels)
    renderGuildPage(queryClient, { channelId: '44' })

    expect(await screen.findByRole('heading', { name: 'Welcome to Lounge' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Message #Lounge')).not.toBeInTheDocument()
    expect(messageApi.listMessages).not.toHaveBeenCalled()
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
    onOpenChannelSettings?: (channel: GuildChannelSummary) => void
    onOpenSettings?: () => void
    onOpenUserSettings?: () => void
    onSelectChannel?: (channelId: string) => void
  } = {},
) {
  render(
    <QueryClientProvider client={queryClient}>
      <GuildPage guildId="42" {...props} />
    </QueryClientProvider>,
  )
}
