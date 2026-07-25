import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authSessionQueryKey } from '@/features/auth/auth-session'

import { guildsQueryKey, type GuildSummary } from '@/features/guilds/guild-queries'

import { GuildSettingsPage } from '@/features/guilds/pages/guild-settings-page'

const guildApi = vi.hoisted(() => ({
  abortGuildIconUpload: vi.fn(),
  addGuildMemberRole: vi.fn(),
  completeGuildIconUpload: vi.fn(),
  createGuildIconUpload: vi.fn(),
  createGuildRole: vi.fn(),
  deleteGuildRole: vi.fn(),
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
  listGuildMembers: vi.fn(),
  listGuildMemberRoles: vi.fn(),
  listGuildRoles: vi.fn(),
  removeGuildMemberRole: vi.fn(),
  reorderGuildRoles: vi.fn(),
  updateGuild: vi.fn(),
  updateGuildRole: vi.fn(),
}))

vi.mock('@/api/guild', () => guildApi)

const assetsApi = vi.hoisted(() => ({
  putToPresignedUrl: vi.fn(),
  resolveAvatarUrl: vi.fn(),
  resolveGuildIconUrl: vi.fn(),
}))

vi.mock('@/api/assets', () => assetsApi)

vi.mock('@/features/guilds/components/guild-icon-crop-dialog', () => ({
  GuildIconCropDialog: ({
    file,
    onCancel,
    onConfirm,
  }: {
    file: File
    onCancel: () => void
    onConfirm: (file: File) => void
  }) => (
    <div role="dialog" aria-label="Edit image">
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
      <button type="button" onClick={() => onConfirm(file)}>
        Upload
      </button>
    </div>
  ),
}))

const userApi = vi.hoisted(() => ({
  getUserProfile: vi.fn(),
}))

vi.mock('@/api/user', () => userApi)

const guild: GuildSummary = {
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
  assetsApi.resolveGuildIconUrl.mockReturnValue(undefined)
  guildApi.listGuildMembers.mockResolvedValue({ members: [] })
  guildApi.listGuildMemberRoles.mockResolvedValue([])
  guildApi.listGuildRoles.mockResolvedValue([])
  userApi.getUserProfile.mockImplementation(async (userId: string) => ({
    avatarAssetId: '0',
    createdAt: 500,
    name: userId === '7' ? 'Alex Chen' : 'Sam Rivera',
    updatedAt: 1_000,
    userId,
    username: userId === '7' ? 'alex_chen' : 'sam_rivera',
  }))
})

describe('GuildSettingsPage', () => {
  it('updates the community name and description and refreshes the guild cache', async () => {
    const queryClient = createQueryClient()
    guildApi.updateGuild.mockResolvedValue({
      ...guild,
      description: 'Updated community description.',
      name: 'Cordis Community',
      revision: 2,
      updatedAt: 2_000,
    })
    renderSettings(queryClient)
    const user = userEvent.setup()

    const nameInput = screen.getByRole('textbox', { name: /Community name/ })
    await user.clear(nameInput)
    await user.type(nameInput, 'Cordis Community')
    const descriptionInput = screen.getByRole('textbox', { name: /Description/ })
    await user.clear(descriptionInput)
    await user.type(descriptionInput, 'Updated community description.')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(guildApi.updateGuild).toHaveBeenCalledOnce())
    expect(guildApi.updateGuild).toHaveBeenCalledWith('42', {
      description: 'Updated community description.',
      name: 'Cordis Community',
    })
    expect(queryClient.getQueryData<GuildSummary[]>(guildsQueryKey)?.[0]).toMatchObject({
      description: 'Updated community description.',
      name: 'Cordis Community',
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Community settings saved.')
  })

  it('uploads a community icon and refreshes the guild cache', async () => {
    const queryClient = createQueryClient()
    guildApi.createGuildIconUpload.mockResolvedValue({
      expiresAt: 1_800_000,
      presignedUrl: 'https://storage.example/upload',
      requestHeaders: { 'Content-Type': 'image/png' },
      uploadId: '99',
    })
    assetsApi.putToPresignedUrl.mockResolvedValue(undefined)
    guildApi.completeGuildIconUpload.mockResolvedValue({
      ...guild,
      iconAssetId: '99',
      revision: 2,
      updatedAt: 2_000,
    })
    renderSettings(queryClient)
    const user = userEvent.setup()
    const file = new File(['icon-bytes'], 'icon.png', { type: 'image/png' })

    await user.upload(screen.getByLabelText('Upload community icon'), file)
    expect(await screen.findByRole('dialog', { name: 'Edit image' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Upload' }))

    await waitFor(() => expect(guildApi.createGuildIconUpload).toHaveBeenCalledOnce())
    expect(guildApi.createGuildIconUpload).toHaveBeenCalledWith('42', {
      contentType: 'image/png',
      expectedSize: file.size,
    })
    expect(assetsApi.putToPresignedUrl).toHaveBeenCalledWith(file, {
      expiresAt: 1_800_000,
      presignedUrl: 'https://storage.example/upload',
      requestHeaders: { 'Content-Type': 'image/png' },
      uploadId: '99',
    })
    expect(guildApi.completeGuildIconUpload).toHaveBeenCalledWith('42', '99')
    expect(guildApi.abortGuildIconUpload).not.toHaveBeenCalled()
    expect(queryClient.getQueryData<GuildSummary[]>(guildsQueryKey)?.[0]).toMatchObject({
      iconAssetId: '99',
      revision: 2,
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Community icon updated.')
  })

  it('rejects unsupported icon files before creating an upload', async () => {
    renderSettings(createQueryClient())
    const input = screen.getByLabelText('Upload community icon')
    const file = new File(['icon-bytes'], 'icon.gif', { type: 'image/gif' })

    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a JPEG, PNG, or WebP image.')
    expect(screen.queryByRole('dialog', { name: 'Edit image' })).not.toBeInTheDocument()
    expect(guildApi.createGuildIconUpload).not.toHaveBeenCalled()
  })

  it('rejects oversized icon files before opening the crop dialog', async () => {
    renderSettings(createQueryClient())
    const input = screen.getByLabelText('Upload community icon')
    const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'icon.png', {
      type: 'image/png',
    })

    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByRole('alert')).toHaveTextContent('Choose an image up to 10 MB.')
    expect(screen.queryByRole('dialog', { name: 'Edit image' })).not.toBeInTheDocument()
    expect(guildApi.createGuildIconUpload).not.toHaveBeenCalled()
  })

  it('aborts an upload when the direct PUT fails', async () => {
    guildApi.createGuildIconUpload.mockResolvedValue({
      expiresAt: 1_800_000,
      presignedUrl: 'https://storage.example/upload',
      requestHeaders: { 'Content-Type': 'image/png' },
      uploadId: '99',
    })
    assetsApi.putToPresignedUrl.mockRejectedValue(new Error('upload failed'))
    guildApi.abortGuildIconUpload.mockResolvedValue(undefined)
    renderSettings(createQueryClient())
    const user = userEvent.setup()
    const file = new File(['icon-bytes'], 'icon.png', { type: 'image/png' })

    await user.upload(screen.getByLabelText('Upload community icon'), file)
    await user.click(await screen.findByRole('button', { name: 'Upload' }))

    await waitFor(() => expect(guildApi.abortGuildIconUpload).toHaveBeenCalledWith('42', '99'))
    expect(guildApi.completeGuildIconUpload).not.toHaveBeenCalled()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to update the community icon. Please try again.',
    )
  })

  it('aborts an upload when completion fails after a successful PUT', async () => {
    guildApi.createGuildIconUpload.mockResolvedValue({
      expiresAt: 1_800_000,
      presignedUrl: 'https://storage.example/upload',
      requestHeaders: { 'Content-Type': 'image/png' },
      uploadId: '99',
    })
    assetsApi.putToPresignedUrl.mockResolvedValue(undefined)
    guildApi.completeGuildIconUpload.mockRejectedValue(new Error('complete failed'))
    guildApi.abortGuildIconUpload.mockResolvedValue(undefined)
    renderSettings(createQueryClient())
    const user = userEvent.setup()
    const file = new File(['icon-bytes'], 'icon.png', { type: 'image/png' })

    await user.upload(screen.getByLabelText('Upload community icon'), file)
    await user.click(await screen.findByRole('button', { name: 'Upload' }))

    await waitFor(() => expect(guildApi.abortGuildIconUpload).toHaveBeenCalledWith('42', '99'))
    expect(assetsApi.putToPresignedUrl).toHaveBeenCalledOnce()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to update the community icon. Please try again.',
    )
  })

  it('cancels cropping without starting an upload', async () => {
    renderSettings(createQueryClient())
    const user = userEvent.setup()
    const file = new File(['icon-bytes'], 'icon.png', { type: 'image/png' })

    await user.upload(screen.getByLabelText('Upload community icon'), file)
    expect(await screen.findByRole('dialog', { name: 'Edit image' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog', { name: 'Edit image' })).not.toBeInTheDocument()
    expect(guildApi.createGuildIconUpload).not.toHaveBeenCalled()
  })

  it('blocks direct access for a user who is not the owner', () => {
    const queryClient = createQueryClient('8')
    renderSettings(queryClient)

    expect(screen.getByRole('heading', { name: 'You don’t have permission' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()
  })

  it('renders a two-pane role list and switches the selected permissions', async () => {
    guildApi.listGuildRoles.mockResolvedValue([
      {
        createdAt: 1_000,
        guildId: '42',
        id: '51',
        isDefault: true,
        name: 'Everyone',
        permissions: '1',
        position: 0,
        revision: 1,
        updatedAt: 1_000,
      },
      {
        createdAt: 1_000,
        guildId: '42',
        id: '52',
        isDefault: false,
        name: 'Moderators',
        permissions: '7',
        position: 10,
        revision: 1,
        updatedAt: 1_000,
      },
    ])
    renderSettings(createQueryClient(), { section: 'roles' })
    const user = userEvent.setup()

    const roleNavigation = await screen.findByRole('navigation', { name: 'Community roles' })
    expect(roleNavigation).toHaveClass('lg:sticky', 'lg:top-0')
    const moderatorButton = within(roleNavigation).getByRole('button', {
      name: 'Select role Moderators',
    })
    const everyoneButton = within(roleNavigation).getByRole('button', {
      name: 'Select role Everyone',
    })
    expect(moderatorButton).toHaveTextContent('3 permissions')
    expect(moderatorButton).toHaveAttribute('aria-pressed', 'true')
    expect(everyoneButton).toHaveTextContent('Default')

    const moderatorPermissions = screen.getByRole('region', { name: 'Moderators' })
    expect(
      within(moderatorPermissions).getByRole('switch', { name: 'Administrator' }),
    ).toBeChecked()
    expect(
      within(moderatorPermissions).getByRole('switch', { name: 'Manage community' }),
    ).toBeChecked()
    expect(within(moderatorPermissions).getByRole('switch', { name: 'Manage roles' })).toBeChecked()
    expect(
      within(moderatorPermissions).getByRole('switch', { name: 'Manage members' }),
    ).not.toBeChecked()

    await user.click(everyoneButton)

    const everyonePermissions = screen.getByRole('region', { name: 'Everyone' })
    expect(within(everyonePermissions).getByRole('switch', { name: 'Administrator' })).toBeChecked()
    expect(
      within(everyonePermissions).getByRole('switch', { name: 'Manage community' }),
    ).not.toBeChecked()
  })

  it('creates a role and selects it for editing', async () => {
    const createdRole = roleSummary({ id: '53', name: 'Helpers', position: 1 })
    guildApi.listGuildRoles.mockResolvedValue([])
    guildApi.createGuildRole.mockResolvedValue(createdRole)
    renderSettings(createQueryClient(), { section: 'roles' })
    const user = userEvent.setup()

    const roleNavigation = await screen.findByRole('navigation', { name: 'Community roles' })
    await user.click(within(roleNavigation).getByRole('button', { name: 'Create role' }))
    await user.type(within(roleNavigation).getByRole('textbox', { name: 'Role name' }), 'Helpers')
    await user.click(within(roleNavigation).getByRole('button', { name: 'Create' }))

    await waitFor(() =>
      expect(guildApi.createGuildRole).toHaveBeenCalledWith('42', {
        name: 'Helpers',
        permissions: '0',
      }),
    )
    expect(await screen.findByRole('region', { name: 'Helpers' })).toBeInTheDocument()
  })

  it('updates a role name and permission bitfield', async () => {
    const role = roleSummary({ id: '52', name: 'Helpers', position: 1 })
    const updatedRole = { ...role, name: 'Moderators', permissions: '2', revision: 2 }
    guildApi.listGuildRoles.mockResolvedValue([role])
    guildApi.updateGuildRole.mockResolvedValue(updatedRole)
    renderSettings(createQueryClient(), { section: 'roles' })
    const user = userEvent.setup()

    const editor = await screen.findByRole('region', { name: 'Helpers' })
    const nameInput = within(editor).getByRole('textbox', { name: 'Role name' })
    await user.clear(nameInput)
    await user.type(nameInput, 'Moderators')
    await user.click(within(editor).getByRole('switch', { name: 'Manage community' }))
    await user.click(within(editor).getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(guildApi.updateGuildRole).toHaveBeenCalledWith('42', '52', {
        name: 'Moderators',
        permissions: '2',
      }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent('Role settings saved.')
  })

  it('deletes a non-default role after confirmation', async () => {
    guildApi.listGuildRoles.mockResolvedValue([
      roleSummary({ id: '52', name: 'Helpers', position: 1 }),
    ])
    guildApi.deleteGuildRole.mockResolvedValue(undefined)
    renderSettings(createQueryClient(), { section: 'roles' })
    const user = userEvent.setup()

    const editor = await screen.findByRole('region', { name: 'Helpers' })
    await user.click(within(editor).getByRole('button', { name: 'Delete role' }))
    await user.click(within(editor).getByRole('button', { name: 'Confirm delete' }))

    await waitFor(() => expect(guildApi.deleteGuildRole).toHaveBeenCalledWith('42', '52'))
    expect(screen.queryByRole('region', { name: 'Helpers' })).not.toBeInTheDocument()
  })

  it('reorders non-default roles from the role list', async () => {
    const moderators = roleSummary({ id: '52', name: 'Moderators', position: 2 })
    const helpers = roleSummary({ id: '53', name: 'Helpers', position: 1 })
    guildApi.listGuildRoles.mockResolvedValue([helpers, moderators])
    guildApi.reorderGuildRoles.mockResolvedValue([
      { ...helpers, position: 2 },
      { ...moderators, position: 1 },
    ])
    renderSettings(createQueryClient(), { section: 'roles' })
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Move Helpers up' }))

    await waitFor(() =>
      expect(guildApi.reorderGuildRoles).toHaveBeenCalledWith('42', [
        { position: 2, roleId: '53' },
        { position: 1, roleId: '52' },
      ]),
    )
  })

  it('renders member profiles and owner status', async () => {
    guildApi.listGuildMembers.mockResolvedValue({
      members: [
        {
          guildId: '42',
          joinedAt: 1_000,
          nickname: '',
          profile: {
            avatarAssetId: '0',
            createdAt: 500,
            name: 'Alex Chen',
            updatedAt: 1_000,
            userId: '7',
            username: 'alex_chen',
          },
          revision: 1,
          updatedAt: 1_000,
          userId: '7',
        },
      ],
    })
    renderSettings(createQueryClient(), { section: 'members' })

    expect(await screen.findByText('Alex Chen')).toBeInTheDocument()
    expect(screen.getByText('@alex_chen')).toBeInTheDocument()
    expect(screen.getByText('Owner')).toBeInTheDocument()
    expect(userApi.getUserProfile).not.toHaveBeenCalled()
  })

  it('assigns and removes members from a role in the members tab', async () => {
    const role = roleSummary({ id: '52', name: 'Moderators', position: 1 })
    guildApi.listGuildRoles.mockResolvedValue([role])
    guildApi.listGuildMembers.mockResolvedValue({
      members: [
        {
          guildId: '42',
          joinedAt: 1_000,
          nickname: '',
          profile: {
            avatarAssetId: '0',
            createdAt: 500,
            name: 'Sam Rivera',
            updatedAt: 1_000,
            userId: '8',
            username: 'sam_rivera',
          },
          revision: 1,
          updatedAt: 1_000,
          userId: '8',
        },
      ],
    })
    guildApi.addGuildMemberRole.mockResolvedValue(undefined)
    guildApi.removeGuildMemberRole.mockResolvedValue(undefined)
    renderSettings(createQueryClient(), { section: 'roles' })
    const user = userEvent.setup()

    const editor = await screen.findByRole('region', { name: 'Moderators' })
    await user.click(within(editor).getByRole('tab', { name: 'Members' }))

    const assignment = await within(editor).findByRole('checkbox', {
      name: 'Moderators role for user 8',
    })
    expect(assignment).not.toBeChecked()
    expect(await within(editor).findByText('Sam Rivera')).toBeInTheDocument()
    expect(within(editor).getByText('@sam_rivera')).toBeInTheDocument()
    expect(userApi.getUserProfile).not.toHaveBeenCalled()

    await user.click(assignment)
    await waitFor(() => expect(guildApi.addGuildMemberRole).toHaveBeenCalledWith('42', '8', '52'))
    expect(assignment).toBeChecked()

    await user.click(assignment)
    await waitFor(() =>
      expect(guildApi.removeGuildMemberRole).toHaveBeenCalledWith('42', '8', '52'),
    )
    expect(assignment).not.toBeChecked()
  })

  it('requests a section change from the settings navigation', async () => {
    const onSelectSection = vi.fn()
    renderSettings(createQueryClient(), { onSelectSection })
    const user = userEvent.setup()

    await user.click(screen.getAllByRole('button', { name: 'Roles' })[0]!)

    expect(onSelectSection).toHaveBeenCalledWith('roles')
  })
})

function createQueryClient(userId = '7') {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })
  queryClient.setQueryData(authSessionQueryKey, {
    profile: { name: 'Alex Chen', username: 'alex_chen' },
    user: { email: 'alex@example.com', userId: BigInt(userId) },
  })
  queryClient.setQueryData(guildsQueryKey, [guild])
  return queryClient
}

function renderSettings(
  queryClient: QueryClient,
  props: {
    onSelectSection?: (section: 'members' | 'overview' | 'roles') => void
    section?: 'members' | 'overview' | 'roles'
  } = {},
) {
  render(
    <QueryClientProvider client={queryClient}>
      <GuildSettingsPage guildId="42" onClose={vi.fn()} {...props} />
    </QueryClientProvider>,
  )
}

function roleSummary(
  overrides: Partial<{
    id: string
    isDefault: boolean
    name: string
    permissions: string
    position: number
    revision: number
  }> = {},
) {
  return {
    createdAt: 1_000,
    guildId: '42',
    id: '50',
    isDefault: false,
    name: 'Role',
    permissions: '0',
    position: 1,
    revision: 1,
    updatedAt: 1_000,
    ...overrides,
  }
}
