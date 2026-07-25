import { beforeEach, describe, expect, it, vi } from 'vitest'

const guildClient = vi.hoisted(() => ({
  addGuildMemberRole: vi.fn(),
  createGuild: vi.fn(),
  createGuildChannel: vi.fn(),
  createGuildRole: vi.fn(),
  deleteGuildRole: vi.fn(),
  listGuildChannels: vi.fn(),
  listGuildMemberRoles: vi.fn(),
  listGuildMembers: vi.fn(),
  listGuildRoles: vi.fn(),
  reorderGuildChannels: vi.fn(),
  reorderGuildRoles: vi.fn(),
  removeGuildMemberRole: vi.fn(),
  updateGuild: vi.fn(),
  updateGuildRole: vi.fn(),
}))

vi.mock('@connectrpc/connect', () => ({
  createClient: () => guildClient,
}))
vi.mock('./client', () => ({ apiTransport: {} }))

import {
  addGuildMemberRole,
  createGuildChannel,
  createGuildRole,
  deleteGuildRole,
  listGuildChannels,
  listGuildMemberRoles,
  listGuildMembers,
  listGuildRoles,
  reorderGuildChannels,
  reorderGuildRoles,
  removeGuildMemberRole,
  updateGuild,
  updateGuildRole,
} from './guild'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('guild API', () => {
  it('maps channel identifiers into the application boundary', async () => {
    guildClient.listGuildChannels.mockResolvedValue({
      channels: [
        {
          guildId: 42n,
          id: 43n,
          name: 'general',
          parentId: 0n,
          position: 0,
          revision: 1n,
          topic: 'Welcome',
          type: 1,
        },
      ],
    })

    await expect(listGuildChannels('42')).resolves.toEqual([
      {
        guildId: '42',
        id: '43',
        name: 'general',
        parentId: undefined,
        position: 0,
        revision: 1,
        topic: 'Welcome',
        type: 1,
      },
    ])
    expect(guildClient.listGuildChannels).toHaveBeenCalledWith({ guildId: 42n })
  })

  it('rejects an invalid guild route parameter before calling the API', async () => {
    await expect(listGuildChannels('not-an-id')).rejects.toThrow('guild id is invalid')
    expect(guildClient.listGuildChannels).not.toHaveBeenCalled()
  })

  it('updates a guild and maps its identifiers into the application boundary', async () => {
    guildClient.updateGuild.mockResolvedValue({
      guild: {
        createdAt: 1_000n,
        iconAssetId: 9n,
        id: 42n,
        name: 'Cordis Community',
        ownerId: 7n,
        revision: 2n,
        updatedAt: 2_000n,
      },
    })

    await expect(updateGuild('42', 'Cordis Community')).resolves.toEqual({
      createdAt: 1_000,
      iconAssetId: '9',
      id: '42',
      name: 'Cordis Community',
      ownerId: '7',
      revision: 2,
      updatedAt: 2_000,
    })
    expect(guildClient.updateGuild).toHaveBeenCalledWith({
      guildId: 42n,
      name: 'Cordis Community',
    })
  })

  it('lists guild roles in the application representation', async () => {
    guildClient.listGuildRoles.mockResolvedValue({
      roles: [
        {
          createdAt: 1_000n,
          guildId: 42n,
          id: 50n,
          isDefault: true,
          name: 'Everyone',
          permissions: 5n,
          position: 0,
          revision: 1n,
          updatedAt: 2_000n,
        },
      ],
    })

    await expect(listGuildRoles('42')).resolves.toEqual([
      {
        createdAt: 1_000,
        guildId: '42',
        id: '50',
        isDefault: true,
        name: 'Everyone',
        permissions: '5',
        position: 0,
        revision: 1,
        updatedAt: 2_000,
      },
    ])
    expect(guildClient.listGuildRoles).toHaveBeenCalledWith({ guildId: 42n })
  })

  it('creates and updates guild roles with permission bitfields', async () => {
    guildClient.createGuildRole.mockResolvedValue({ role: roleMessage() })
    guildClient.updateGuildRole.mockResolvedValue({
      role: roleMessage({ name: 'Moderators', permissions: 7n, revision: 2n }),
    })

    await expect(
      createGuildRole('42', { name: 'Helpers', permissions: '3' }),
    ).resolves.toMatchObject({ id: '50', name: 'Helpers', permissions: '3' })
    expect(guildClient.createGuildRole).toHaveBeenCalledWith({
      guildId: 42n,
      name: 'Helpers',
      permissions: 3n,
    })

    await expect(
      updateGuildRole('42', '50', { name: 'Moderators', permissions: '7' }),
    ).resolves.toMatchObject({ id: '50', name: 'Moderators', permissions: '7', revision: 2 })
    expect(guildClient.updateGuildRole).toHaveBeenCalledWith({
      guildId: 42n,
      name: 'Moderators',
      permissions: 7n,
      roleId: 50n,
    })
  })

  it('deletes a guild role after the API accepts it', async () => {
    guildClient.deleteGuildRole.mockResolvedValue({ ok: true })

    await expect(deleteGuildRole('42', '50')).resolves.toBeUndefined()
    expect(guildClient.deleteGuildRole).toHaveBeenCalledWith({ guildId: 42n, roleId: 50n })
  })

  it('reorders guild roles with validated positions', async () => {
    guildClient.reorderGuildRoles.mockResolvedValue({ roles: [] })

    await expect(
      reorderGuildRoles('42', [
        { position: 2, roleId: '50' },
        { position: 1, roleId: '51' },
      ]),
    ).resolves.toEqual([])
    expect(guildClient.reorderGuildRoles).toHaveBeenCalledWith({
      guildId: 42n,
      positions: [
        { position: 2, roleId: 50n },
        { position: 1, roleId: 51n },
      ],
    })
  })

  it('lists a page of guild members with its next cursor', async () => {
    guildClient.listGuildMembers.mockResolvedValue({
      beforeUserId: 6n,
      members: [
        {
          guildId: 42n,
          joinedAt: 1_000n,
          nickname: 'Alex',
          revision: 2n,
          updatedAt: 2_000n,
          userId: 7n,
        },
      ],
    })

    await expect(listGuildMembers('42', '8')).resolves.toEqual({
      beforeUserId: '6',
      members: [
        {
          guildId: '42',
          joinedAt: 1_000,
          nickname: 'Alex',
          revision: 2,
          updatedAt: 2_000,
          userId: '7',
        },
      ],
    })
    expect(guildClient.listGuildMembers).toHaveBeenCalledWith({
      beforeUserId: 8n,
      guildId: 42n,
      limit: 50,
    })
  })

  it('lists and updates roles assigned to a guild member', async () => {
    guildClient.listGuildMemberRoles.mockResolvedValue({ roles: [roleMessage()] })
    guildClient.addGuildMemberRole.mockResolvedValue({ ok: true })
    guildClient.removeGuildMemberRole.mockResolvedValue({ ok: true })

    await expect(listGuildMemberRoles('42', '7')).resolves.toEqual([
      expect.objectContaining({ guildId: '42', id: '50', name: 'Helpers' }),
    ])
    expect(guildClient.listGuildMemberRoles).toHaveBeenCalledWith({
      guildId: 42n,
      userId: 7n,
    })

    await expect(addGuildMemberRole('42', '7', '50')).resolves.toBeUndefined()
    expect(guildClient.addGuildMemberRole).toHaveBeenCalledWith({
      guildId: 42n,
      roleId: 50n,
      userId: 7n,
    })

    await expect(removeGuildMemberRole('42', '7', '50')).resolves.toBeUndefined()
    expect(guildClient.removeGuildMemberRole).toHaveBeenCalledWith({
      guildId: 42n,
      roleId: 50n,
      userId: 7n,
    })
  })

  it('creates a text or voice channel inside the requested category', async () => {
    guildClient.createGuildChannel.mockResolvedValue({
      channel: {
        guildId: 42n,
        id: 47n,
        name: 'design',
        parentId: 45n,
        position: 2,
        revision: 1n,
        topic: '',
        type: 1,
      },
    })

    await expect(
      createGuildChannel({
        guildId: '42',
        name: 'design',
        parentId: '45',
        type: 'text',
      }),
    ).resolves.toEqual({
      guildId: '42',
      id: '47',
      name: 'design',
      parentId: '45',
      position: 2,
      revision: 1,
      topic: '',
      type: 1,
    })
    expect(guildClient.createGuildChannel).toHaveBeenCalledWith({
      guildId: 42n,
      name: 'design',
      parentId: 45n,
      topic: '',
      type: 1,
    })
  })

  it('uses a zero parent for guild-level channels and categories', async () => {
    guildClient.createGuildChannel.mockResolvedValue({
      channel: {
        guildId: 42n,
        id: 48n,
        name: 'Announcements',
        parentId: 0n,
        position: 3,
        revision: 1n,
        topic: '',
        type: 2,
      },
    })

    await createGuildChannel({
      guildId: '42',
      name: 'Announcements',
      type: 'category',
    })

    expect(guildClient.createGuildChannel).toHaveBeenCalledWith({
      guildId: 42n,
      name: 'Announcements',
      parentId: 0n,
      topic: '',
      type: 2,
    })
  })

  it('reorders guild channels with validated positions', async () => {
    guildClient.reorderGuildChannels.mockResolvedValue({ channels: [] })

    await expect(
      reorderGuildChannels('42', [
        { channelId: '44', parentId: '45', position: 0 },
        { channelId: '43', parentId: null, position: 1 },
        { channelId: '42', position: 2 },
      ]),
    ).resolves.toEqual([])
    expect(guildClient.reorderGuildChannels).toHaveBeenCalledWith({
      guildId: 42n,
      positions: [
        { channelId: 44n, parentId: 45n, position: 0 },
        { channelId: 43n, parentId: 0n, position: 1 },
        { channelId: 42n, position: 2 },
      ],
    })
  })
})

function roleMessage(
  overrides: Partial<{
    name: string
    permissions: bigint
    revision: bigint
  }> = {},
) {
  return {
    createdAt: 1_000n,
    guildId: 42n,
    id: 50n,
    isDefault: false,
    name: 'Helpers',
    permissions: 3n,
    position: 1,
    revision: 1n,
    updatedAt: 2_000n,
    ...overrides,
  }
}
