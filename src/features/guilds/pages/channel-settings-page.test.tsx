import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authSessionQueryKey } from '@/features/auth/auth-session'
import {
  guildChannelOverwritesQueryKey,
  guildChannelsQueryKey,
  guildRolesQueryKey,
  guildsQueryKey,
  type GuildChannelSummary,
  type GuildSummary,
} from '@/features/guilds/guild-queries'
import { ChannelSettingsPage } from '@/features/guilds/pages/channel-settings-page'

const guildApi = vi.hoisted(() => ({
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
  listGuildChannelPermissionOverwrites: vi.fn(),
  listGuildMemberRoles: vi.fn(),
  listGuildRoles: vi.fn(),
  updateGuildChannel: vi.fn(),
  upsertGuildChannelPermissionOverwrite: vi.fn(),
  deleteGuildChannelPermissionOverwrite: vi.fn(),
}))

vi.mock('@/api/guild', () => guildApi)

const userApi = vi.hoisted(() => ({
  getUserProfile: vi.fn(),
}))

vi.mock('@/api/user', () => userApi)

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

const channel: GuildChannelSummary = {
  guildId: '42',
  id: '43',
  name: 'general',
  position: 0,
  revision: 1,
  topic: 'Welcome',
  type: 1,
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

beforeEach(() => {
  vi.clearAllMocks()
  guildApi.listGuildRoles.mockResolvedValue([everyoneRole])
  guildApi.listGuildMemberRoles.mockResolvedValue([])
  guildApi.listGuildChannelPermissionOverwrites.mockResolvedValue([])
  userApi.getUserProfile.mockResolvedValue({
    name: 'Alex Chen',
    username: 'alex_chen',
  })
})

describe('ChannelSettingsPage', () => {
  it('saves only patched overview fields', async () => {
    guildApi.updateGuildChannel.mockResolvedValue({
      ...channel,
      name: 'lobby',
      revision: 2,
      topic: 'Welcome',
    })
    const queryClient = createQueryClient()
    renderChannelSettings(queryClient)
    const user = userEvent.setup()

    const nameInput = await screen.findByDisplayValue('general')
    await user.clear(nameInput)
    await user.type(nameInput, 'lobby')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(guildApi.updateGuildChannel).toHaveBeenCalledWith('43', { name: 'lobby' }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent('Channel settings saved.')
    expect(queryClient.getQueryData(guildChannelsQueryKey('42'))).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: '43', name: 'lobby' })]),
    )
  })

  it('lists overwrites in a two-pane layout', async () => {
    guildApi.listGuildChannelPermissionOverwrites.mockResolvedValue([
      {
        allow: '32',
        appliesTo: 'role',
        appliesToId: '42',
        channelId: '43',
        createdAt: 1_000,
        deny: '64',
        guildId: '42',
        revision: 1,
        updatedAt: 2_000,
      },
      {
        allow: '0',
        appliesTo: 'member',
        appliesToId: '7',
        channelId: '43',
        createdAt: 1_500,
        deny: '128',
        guildId: '42',
        revision: 1,
        updatedAt: 2_500,
      },
    ])
    const queryClient = createQueryClient()
    queryClient.setQueryData(guildRolesQueryKey('42'), [everyoneRole])
    renderChannelSettings(queryClient, { tab: 'overwrites' })

    const list = await screen.findByRole('navigation', { name: 'Channel overwrites' })
    const overwriteButtons = within(list)
      .getAllByRole('button')
      .filter((button) => button.getAttribute('aria-label') !== 'Add role overwrite')
    // Member overwrites sit above @everyone (bottom).
    expect(overwriteButtons[0]).toHaveAccessibleName(/Alex Chen|Loading member/i)
    expect(overwriteButtons[1]).toHaveAccessibleName(/@everyone/i)

    expect(
      await screen.findByRole('heading', { name: /Alex Chen|Loading member/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Manage channels' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Manage channels deny' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(queryClient.getQueryData(guildChannelOverwritesQueryKey('42', '43'))).toHaveLength(2)
  })

  it('saves overwrite permission changes only when Save is clicked', async () => {
    guildApi.listGuildChannelPermissionOverwrites.mockResolvedValue([
      {
        allow: '0',
        appliesTo: 'role',
        appliesToId: '42',
        channelId: '43',
        createdAt: 1_000,
        deny: '0',
        guildId: '42',
        revision: 1,
        updatedAt: 1_000,
      },
    ])
    guildApi.listGuildRoles.mockResolvedValue([everyoneRole])
    guildApi.upsertGuildChannelPermissionOverwrite.mockResolvedValue({
      allow: '32',
      appliesTo: 'role',
      appliesToId: '42',
      channelId: '43',
      createdAt: 1_000,
      deny: '0',
      guildId: '42',
      revision: 2,
      updatedAt: 2_000,
    })
    const queryClient = createQueryClient()
    renderChannelSettings(queryClient, { tab: 'overwrites' })
    const user = userEvent.setup()

    await user.click(await screen.findByRole('radio', { name: 'View channels allow' }))
    expect(guildApi.upsertGuildChannelPermissionOverwrite).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(guildApi.upsertGuildChannelPermissionOverwrite).toHaveBeenCalledWith('43', {
        allow: '32',
        appliesTo: 'role',
        appliesToId: '42',
        deny: '0',
      }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent('Overwrite saved.')
    expect(queryClient.getQueryData(guildChannelOverwritesQueryKey('42', '43'))).toEqual([
      expect.objectContaining({ allow: '32', deny: '0', revision: 2 }),
    ])
  })

  it('deletes a non-default overwrite after confirmation', async () => {
    const helpersRole = {
      ...everyoneRole,
      id: '50',
      isDefault: false,
      name: 'Helpers',
      permissions: '0',
      position: 1,
    }
    guildApi.listGuildChannelPermissionOverwrites.mockResolvedValue([
      {
        allow: '0',
        appliesTo: 'role',
        appliesToId: '42',
        channelId: '43',
        createdAt: 1_000,
        deny: '0',
        guildId: '42',
        revision: 1,
        updatedAt: 1_000,
      },
      {
        allow: '32',
        appliesTo: 'role',
        appliesToId: '50',
        channelId: '43',
        createdAt: 2_000,
        deny: '0',
        guildId: '42',
        revision: 1,
        updatedAt: 2_000,
      },
    ])
    guildApi.listGuildRoles.mockResolvedValue([everyoneRole, helpersRole])
    guildApi.deleteGuildChannelPermissionOverwrite.mockResolvedValue(undefined)
    const queryClient = createQueryClient()
    renderChannelSettings(queryClient, { tab: 'overwrites' })
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: /Helpers/ }))
    await user.click(await screen.findByRole('button', { name: 'Delete overwrite' }))
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }))

    await waitFor(() =>
      expect(guildApi.deleteGuildChannelPermissionOverwrite).toHaveBeenCalledWith('43', {
        appliesTo: 'role',
        appliesToId: '50',
      }),
    )
    await waitFor(() =>
      expect(queryClient.getQueryData(guildChannelOverwritesQueryKey('42', '43'))).toEqual([
        expect.objectContaining({ appliesToId: '42' }),
      ]),
    )
    expect(screen.queryByRole('button', { name: 'Delete overwrite' })).not.toBeInTheDocument()
  })

  it('hides delete for the default @everyone overwrite', async () => {
    guildApi.listGuildChannelPermissionOverwrites.mockResolvedValue([
      {
        allow: '0',
        appliesTo: 'role',
        appliesToId: '42',
        channelId: '43',
        createdAt: 1_000,
        deny: '0',
        guildId: '42',
        revision: 1,
        updatedAt: 1_000,
      },
    ])
    guildApi.listGuildRoles.mockResolvedValue([everyoneRole])
    renderChannelSettings(createQueryClient(), { tab: 'overwrites' })

    expect(await screen.findByRole('heading', { name: '@everyone' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete overwrite' })).not.toBeInTheDocument()
  })

  it('adds a role overwrite from the picker without refetching', async () => {
    const helpersRole = {
      ...everyoneRole,
      id: '50',
      isDefault: false,
      name: 'Helpers',
      permissions: '0',
      position: 1,
    }
    guildApi.listGuildChannelPermissionOverwrites.mockResolvedValue([])
    guildApi.listGuildRoles.mockResolvedValue([everyoneRole, helpersRole])
    guildApi.upsertGuildChannelPermissionOverwrite.mockResolvedValue({
      allow: '0',
      appliesTo: 'role',
      appliesToId: '50',
      channelId: '43',
      createdAt: 3_000,
      deny: '0',
      guildId: '42',
      revision: 1,
      updatedAt: 3_000,
    })
    const queryClient = createQueryClient()
    renderChannelSettings(queryClient, { tab: 'overwrites' })
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Add role overwrite' }))
    const dialog = await screen.findByRole('dialog')
    const existing = within(dialog).queryByRole('checkbox', {
      name: '@everyone already has an overwrite',
    })
    expect(existing).toBeNull()
    await user.click(within(dialog).getByRole('checkbox', { name: 'Add overwrite for Helpers' }))
    await user.click(within(dialog).getByRole('button', { name: 'Add 1 overwrite' }))

    await waitFor(() =>
      expect(guildApi.upsertGuildChannelPermissionOverwrite).toHaveBeenCalledWith('43', {
        allow: '0',
        appliesTo: 'role',
        appliesToId: '50',
        deny: '0',
      }),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByRole('heading', { name: 'Helpers' })).toBeInTheDocument()
    expect(guildApi.listGuildChannelPermissionOverwrites).toHaveBeenCalledTimes(1)
    expect(queryClient.getQueryData(guildChannelOverwritesQueryKey('42', '43'))).toEqual([
      expect.objectContaining({ appliesTo: 'role', appliesToId: '50' }),
    ])
  })

  it('marks roles that already have an overwrite as selected and disabled', async () => {
    guildApi.listGuildChannelPermissionOverwrites.mockResolvedValue([
      {
        allow: '0',
        appliesTo: 'role',
        appliesToId: '42',
        channelId: '43',
        createdAt: 1_000,
        deny: '0',
        guildId: '42',
        revision: 1,
        updatedAt: 1_000,
      },
    ])
    guildApi.listGuildRoles.mockResolvedValue([everyoneRole])
    renderChannelSettings(createQueryClient(), { tab: 'overwrites' })
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Add role overwrite' }))
    const dialog = await screen.findByRole('dialog')
    const assigned = within(dialog).getByRole('checkbox', {
      name: '@everyone already has an overwrite',
    })
    expect(assigned).toBeChecked()
    expect(assigned).toBeDisabled()
  })

  it('denies access without Manage Channels', async () => {
    guildApi.listGuildRoles.mockResolvedValue([{ ...everyoneRole, permissions: '32' }])
    const queryClient = createQueryClient()
    queryClient.setQueryData(guildsQueryKey, [{ ...guild, ownerId: '99' }])
    renderChannelSettings(queryClient)

    expect(
      await screen.findByRole('heading', { name: 'You don’t have permission' }),
    ).toBeInTheDocument()
    expect(screen.queryByDisplayValue('general')).not.toBeInTheDocument()
  })
})

function createQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })
  queryClient.setQueryData(authSessionQueryKey, {
    profile: { name: 'Alex Chen', username: 'alex_chen' },
    user: { email: 'alex@example.com', userId: 7n },
  })
  queryClient.setQueryData(guildsQueryKey, [guild])
  queryClient.setQueryData(guildChannelsQueryKey('42'), [channel])
  return queryClient
}

function renderChannelSettings(
  queryClient: QueryClient,
  props: { tab?: 'overview' | 'overwrites' } = {},
) {
  render(
    <QueryClientProvider client={queryClient}>
      <ChannelSettingsPage
        channelId="43"
        guildId="42"
        tab={props.tab}
        onClose={vi.fn()}
        onSelectTab={vi.fn()}
      />
    </QueryClientProvider>,
  )
}
