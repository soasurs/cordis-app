import { beforeEach, describe, expect, it, vi } from 'vitest'

const guildClient = vi.hoisted(() => ({
  abortGuildIconUpload: vi.fn(),
  addGuildMemberRole: vi.fn(),
  addGuildRoleMembers: vi.fn(),
  completeGuildIconUpload: vi.fn(),
  createGuild: vi.fn(),
  createGuildChannel: vi.fn(),
  createGuildIconUpload: vi.fn(),
  createGuildInvite: vi.fn(),
  createGuildRole: vi.fn(),
  deleteGuildInvite: vi.fn(),
  deleteGuildRole: vi.fn(),
  deleteGuildChannelPermissionOverwrite: vi.fn(),
  getGuildInvite: vi.fn(),
  joinGuildByInvite: vi.fn(),
  listGuildChannelPermissionOverwrites: vi.fn(),
  listGuildChannels: vi.fn(),
  listGuildInvites: vi.fn(),
  listGuildMemberRoles: vi.fn(),
  listGuildMembers: vi.fn(),
  listGuildRoleMembers: vi.fn(),
  listGuildRoles: vi.fn(),
  reorderGuildChannels: vi.fn(),
  reorderGuildRoles: vi.fn(),
  removeGuildMemberRole: vi.fn(),
  removeGuildRoleMembers: vi.fn(),
  updateGuild: vi.fn(),
  updateGuildChannel: vi.fn(),
  updateGuildRole: vi.fn(),
  upsertGuildChannelPermissionOverwrite: vi.fn(),
}))

vi.mock('@connectrpc/connect', () => ({
  createClient: () => guildClient,
}))
vi.mock('@/api/client', () => ({ apiTransport: {} }))

import {
  abortGuildIconUpload,
  addGuildMemberRole,
  addGuildRoleMembers,
  completeGuildIconUpload,
  createGuildChannel,
  createGuildIconUpload,
  createGuildInvite,
  createGuildRole,
  deleteGuildInvite,
  deleteGuildRole,
  deleteGuildChannelPermissionOverwrite,
  getGuildInvite,
  joinGuildByInvite,
  listGuildChannelPermissionOverwrites,
  listGuildChannels,
  listGuildInvites,
  listGuildMemberRoles,
  listGuildMembers,
  listGuildRoleMembers,
  listGuildRoles,
  reorderGuildChannels,
  reorderGuildRoles,
  removeGuildMemberRole,
  removeGuildRoleMembers,
  updateGuild,
  updateGuildChannel,
  updateGuildRole,
  upsertGuildChannelPermissionOverwrite,
} from '@/api/guild'

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
        description: 'A community for thoughtful tools.',
        iconAssetId: 9n,
        id: 42n,
        name: 'Cordis Community',
        ownerId: 7n,
        revision: 2n,
        updatedAt: 2_000n,
      },
    })

    await expect(
      updateGuild('42', {
        description: 'A community for thoughtful tools.',
        name: 'Cordis Community',
      }),
    ).resolves.toEqual({
      createdAt: 1_000,
      description: 'A community for thoughtful tools.',
      iconAssetId: '9',
      id: '42',
      name: 'Cordis Community',
      ownerId: '7',
      revision: 2,
      updatedAt: 2_000,
    })
    expect(guildClient.updateGuild).toHaveBeenCalledWith({
      description: 'A community for thoughtful tools.',
      guildId: 42n,
      name: 'Cordis Community',
    })
  })

  it('omits unchanged guild fields from the update request', async () => {
    guildClient.updateGuild.mockResolvedValue({
      guild: {
        createdAt: 1_000n,
        description: 'Kept description',
        iconAssetId: 0n,
        id: 42n,
        name: 'Renamed',
        ownerId: 7n,
        revision: 2n,
        updatedAt: 2_000n,
      },
    })

    await expect(updateGuild('42', { name: 'Renamed' })).resolves.toMatchObject({ name: 'Renamed' })
    expect(guildClient.updateGuild).toHaveBeenCalledWith({
      guildId: 42n,
      name: 'Renamed',
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

  it('updates default role permissions without sending a name field', async () => {
    guildClient.updateGuildRole.mockResolvedValue({
      role: roleMessage({ isDefault: true, name: '@everyone', permissions: 128n, revision: 2n }),
    })

    await expect(updateGuildRole('42', '42', { permissions: '128' })).resolves.toMatchObject({
      permissions: '128',
      revision: 2,
    })
    expect(guildClient.updateGuildRole).toHaveBeenCalledWith({
      guildId: 42n,
      permissions: 128n,
      roleId: 42n,
    })
  })

  it('updates a role name without sending unchanged permissions', async () => {
    guildClient.updateGuildRole.mockResolvedValue({
      role: roleMessage({ name: 'Moderators', permissions: 3n, revision: 2n }),
    })

    await expect(updateGuildRole('42', '50', { name: 'Moderators' })).resolves.toMatchObject({
      name: 'Moderators',
      revision: 2,
    })
    expect(guildClient.updateGuildRole).toHaveBeenCalledWith({
      guildId: 42n,
      name: 'Moderators',
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

  it('lists the first page of guild members without a cursor', async () => {
    guildClient.listGuildMembers.mockResolvedValue({
      members: [
        {
          guildId: 42n,
          joinedAt: 1_000n,
          nickname: 'Alex',
          profile: {
            avatarAssetId: 9n,
            createdAt: 500n,
            name: 'Alex Chen',
            updatedAt: 1_500n,
            userId: 7n,
            username: 'alex_chen',
          },
          revision: 2n,
          updatedAt: 2_000n,
          userId: 7n,
        },
      ],
      nextCursor: 'opaque-next',
    })

    await expect(listGuildMembers('42')).resolves.toEqual({
      members: [
        {
          guildId: '42',
          joinedAt: 1_000,
          nickname: 'Alex',
          profile: {
            avatarAssetId: '9',
            createdAt: 500,
            name: 'Alex Chen',
            updatedAt: 1_500,
            userId: '7',
            username: 'alex_chen',
          },
          revision: 2,
          updatedAt: 2_000,
          userId: '7',
        },
      ],
      nextCursor: 'opaque-next',
    })
    expect(guildClient.listGuildMembers).toHaveBeenCalledWith({
      guildId: 42n,
      limit: 50,
    })
  })

  it('passes an opaque member cursor through unchanged', async () => {
    guildClient.listGuildMembers.mockResolvedValue({
      members: [],
      nextCursor: 'opaque-page-2',
    })

    await expect(listGuildMembers('42', 'opaque-page-1')).resolves.toEqual({
      members: [],
      nextCursor: 'opaque-page-2',
    })
    expect(guildClient.listGuildMembers).toHaveBeenCalledWith({
      cursor: 'opaque-page-1',
      guildId: 42n,
      limit: 50,
    })
  })

  it('treats a missing next cursor as the end of the member list', async () => {
    guildClient.listGuildMembers.mockResolvedValue({
      members: [
        {
          guildId: 42n,
          joinedAt: 1_000n,
          nickname: '',
          revision: 1n,
          updatedAt: 1_000n,
          userId: 7n,
        },
      ],
    })

    await expect(listGuildMembers('42', 'opaque-last')).resolves.toEqual({
      members: [
        {
          guildId: '42',
          joinedAt: 1_000,
          nickname: '',
          profile: undefined,
          revision: 1,
          updatedAt: 1_000,
          userId: '7',
        },
      ],
      nextCursor: undefined,
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

  it('lists members assigned to a guild role', async () => {
    guildClient.listGuildRoleMembers.mockResolvedValue({
      members: [
        {
          guildId: 42n,
          joinedAt: 1_000n,
          nickname: '',
          revision: 1n,
          updatedAt: 1_000n,
          userId: 8n,
        },
      ],
      nextCursor: 'opaque-next',
    })

    await expect(listGuildRoleMembers('42', '50')).resolves.toEqual({
      members: [
        {
          guildId: '42',
          joinedAt: 1_000,
          nickname: '',
          profile: undefined,
          revision: 1,
          updatedAt: 1_000,
          userId: '8',
        },
      ],
      nextCursor: 'opaque-next',
    })
    expect(guildClient.listGuildRoleMembers).toHaveBeenCalledWith({
      guildId: 42n,
      limit: 50,
      roleId: 50n,
    })
  })

  it('adds and removes many members on a guild role in one request', async () => {
    guildClient.addGuildRoleMembers.mockResolvedValue({ ok: true })
    guildClient.removeGuildRoleMembers.mockResolvedValue({ ok: true })

    await expect(addGuildRoleMembers('42', '50', ['7', '8'])).resolves.toBeUndefined()
    expect(guildClient.addGuildRoleMembers).toHaveBeenCalledWith({
      guildId: 42n,
      roleId: 50n,
      userIds: [7n, 8n],
    })

    await expect(removeGuildRoleMembers('42', '50', ['8'])).resolves.toBeUndefined()
    expect(guildClient.removeGuildRoleMembers).toHaveBeenCalledWith({
      guildId: 42n,
      roleId: 50n,
      userIds: [8n],
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

  it('updates a guild channel with only changed fields', async () => {
    guildClient.updateGuildChannel.mockResolvedValue({
      channel: {
        guildId: 42n,
        id: 43n,
        name: 'lobby',
        parentId: 0n,
        position: 0,
        revision: 2n,
        topic: 'Hang out here',
        type: 1,
      },
    })

    await expect(
      updateGuildChannel('43', { name: 'lobby', topic: 'Hang out here' }),
    ).resolves.toEqual({
      guildId: '42',
      id: '43',
      name: 'lobby',
      position: 0,
      revision: 2,
      topic: 'Hang out here',
      type: 1,
    })
    expect(guildClient.updateGuildChannel).toHaveBeenCalledWith({
      channelId: 43n,
      name: 'lobby',
      topic: 'Hang out here',
    })
  })

  it('omits unchanged guild channel fields from the update request', async () => {
    guildClient.updateGuildChannel.mockResolvedValue({
      channel: {
        guildId: 42n,
        id: 43n,
        name: 'general',
        parentId: 0n,
        position: 0,
        revision: 2n,
        topic: 'Updated topic',
        type: 1,
      },
    })

    await updateGuildChannel('43', { topic: 'Updated topic' })

    expect(guildClient.updateGuildChannel).toHaveBeenCalledWith({
      channelId: 43n,
      topic: 'Updated topic',
    })
  })

  it('lists channel permission overwrites as domain models', async () => {
    guildClient.listGuildChannelPermissionOverwrites.mockResolvedValue({
      overwrites: [
        {
          allow: 32n,
          appliesTo: 1,
          appliesToId: 42n,
          channelId: 43n,
          createdAt: 1_000n,
          deny: 64n,
          guildId: 42n,
          revision: 1n,
          updatedAt: 2_000n,
        },
        {
          allow: 0n,
          appliesTo: 2,
          appliesToId: 7n,
          channelId: 43n,
          createdAt: 1_500n,
          deny: 128n,
          guildId: 42n,
          revision: 1n,
          updatedAt: 2_500n,
        },
      ],
    })

    await expect(listGuildChannelPermissionOverwrites('43')).resolves.toEqual([
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
    expect(guildClient.listGuildChannelPermissionOverwrites).toHaveBeenCalledWith({
      channelId: 43n,
    })
  })

  it('upserts a channel permission overwrite', async () => {
    guildClient.upsertGuildChannelPermissionOverwrite.mockResolvedValue({
      overwrite: {
        allow: 32n,
        appliesTo: 1,
        appliesToId: 50n,
        channelId: 43n,
        createdAt: 1_000n,
        deny: 0n,
        guildId: 42n,
        revision: 1n,
        updatedAt: 1_000n,
      },
    })

    await expect(
      upsertGuildChannelPermissionOverwrite('43', {
        allow: '32',
        appliesTo: 'role',
        appliesToId: '50',
        deny: '0',
      }),
    ).resolves.toEqual({
      allow: '32',
      appliesTo: 'role',
      appliesToId: '50',
      channelId: '43',
      createdAt: 1_000,
      deny: '0',
      guildId: '42',
      revision: 1,
      updatedAt: 1_000,
    })
    expect(guildClient.upsertGuildChannelPermissionOverwrite).toHaveBeenCalledWith({
      allow: 32n,
      appliesTo: 1,
      appliesToId: 50n,
      channelId: 43n,
      deny: 0n,
    })
  })

  it('deletes a channel permission overwrite', async () => {
    guildClient.deleteGuildChannelPermissionOverwrite.mockResolvedValue({ ok: true })

    await expect(
      deleteGuildChannelPermissionOverwrite('43', {
        appliesTo: 'role',
        appliesToId: '50',
      }),
    ).resolves.toBeUndefined()
    expect(guildClient.deleteGuildChannelPermissionOverwrite).toHaveBeenCalledWith({
      appliesTo: 1,
      appliesToId: 50n,
      channelId: 43n,
    })
  })

  it('creates a guild icon upload contract', async () => {
    guildClient.createGuildIconUpload.mockResolvedValue({
      expiresAt: 1_800_000n,
      presignedUrl: 'https://storage.example/upload',
      requestHeaders: {
        'Content-Length': '12',
        'Content-Type': 'image/png',
      },
      uploadId: 99n,
    })

    await expect(
      createGuildIconUpload('42', {
        contentType: 'image/png',
        expectedSize: 12,
      }),
    ).resolves.toEqual({
      expiresAt: 1_800_000,
      presignedUrl: 'https://storage.example/upload',
      requestHeaders: {
        'Content-Length': '12',
        'Content-Type': 'image/png',
      },
      uploadId: '99',
    })
    expect(guildClient.createGuildIconUpload).toHaveBeenCalledWith({
      contentType: 'image/png',
      expectedSize: 12n,
      guildId: 42n,
    })
  })

  it('completes a guild icon upload and maps the updated guild', async () => {
    guildClient.completeGuildIconUpload.mockResolvedValue({
      guild: {
        createdAt: 1_000n,
        description: 'A community for thoughtful tools.',
        iconAssetId: 99n,
        id: 42n,
        name: 'Cordis Community',
        ownerId: 7n,
        revision: 3n,
        updatedAt: 3_000n,
      },
    })

    await expect(completeGuildIconUpload('42', '99')).resolves.toEqual({
      createdAt: 1_000,
      description: 'A community for thoughtful tools.',
      iconAssetId: '99',
      id: '42',
      name: 'Cordis Community',
      ownerId: '7',
      revision: 3,
      updatedAt: 3_000,
    })
    expect(guildClient.completeGuildIconUpload).toHaveBeenCalledWith({
      guildId: 42n,
      uploadId: 99n,
    })
  })

  it('aborts a guild icon upload', async () => {
    guildClient.abortGuildIconUpload.mockResolvedValue({})

    await expect(abortGuildIconUpload('42', '99')).resolves.toBeUndefined()
    expect(guildClient.abortGuildIconUpload).toHaveBeenCalledWith({
      guildId: 42n,
      uploadId: 99n,
    })
  })

  it('rejects invalid guild icon upload identifiers before calling the API', async () => {
    await expect(
      createGuildIconUpload('not-an-id', {
        contentType: 'image/png',
        expectedSize: 12,
      }),
    ).rejects.toThrow('guild id is invalid')
    await expect(completeGuildIconUpload('42', 'bad')).rejects.toThrow('upload id is invalid')
    await expect(abortGuildIconUpload('42', 'bad')).rejects.toThrow('upload id is invalid')
    expect(guildClient.createGuildIconUpload).not.toHaveBeenCalled()
    expect(guildClient.completeGuildIconUpload).not.toHaveBeenCalled()
    expect(guildClient.abortGuildIconUpload).not.toHaveBeenCalled()
  })

  it('rejects invalid expected upload sizes before calling the API', async () => {
    await expect(
      createGuildIconUpload('42', {
        contentType: 'image/png',
        expectedSize: 0,
      }),
    ).rejects.toThrow('expected upload size is invalid')
    await expect(
      createGuildIconUpload('42', {
        contentType: 'image/png',
        expectedSize: 1.5,
      }),
    ).rejects.toThrow('expected upload size is invalid')
    expect(guildClient.createGuildIconUpload).not.toHaveBeenCalled()
  })

  it('maps invite identifiers into the application boundary', async () => {
    guildClient.listGuildInvites.mockResolvedValue({
      invites: [
        {
          code: 'cordis-hello',
          createdAt: 1_000n,
          creator: {
            avatarAssetId: 0n,
            createdAt: 500n,
            name: 'Alex Chen',
            updatedAt: 1_000n,
            userId: 7n,
            username: 'alex_chen',
          },
          creatorUserId: 7n,
          expiresAt: 0n,
          guildId: 42n,
          id: 90n,
          maxUses: 0,
          uses: 2,
        },
      ],
      nextCursor: 'opaque-next',
    })
    guildClient.createGuildInvite.mockResolvedValue({
      invite: {
        code: 'cordis-new',
        createdAt: 2_000n,
        creatorUserId: 7n,
        expiresAt: 3_000n,
        guildId: 42n,
        id: 91n,
        maxUses: 5,
        uses: 0,
      },
    })
    guildClient.deleteGuildInvite.mockResolvedValue({ ok: true })

    await expect(listGuildInvites('42')).resolves.toEqual({
      invites: [
        {
          code: 'cordis-hello',
          createdAt: 1_000,
          creator: {
            avatarAssetId: '0',
            createdAt: 500,
            name: 'Alex Chen',
            updatedAt: 1_000,
            userId: '7',
            username: 'alex_chen',
          },
          creatorUserId: '7',
          expiresAt: 0,
          guildId: '42',
          id: '90',
          maxUses: 0,
          uses: 2,
        },
      ],
      nextCursor: 'opaque-next',
    })
    expect(guildClient.listGuildInvites).toHaveBeenCalledWith({
      guildId: 42n,
      limit: 50,
    })

    await expect(createGuildInvite('42', { expiresInMs: 86_400_000, maxUses: 5 })).resolves.toEqual(
      {
        code: 'cordis-new',
        createdAt: 2_000,
        creator: undefined,
        creatorUserId: '7',
        expiresAt: 3_000,
        guildId: '42',
        id: '91',
        maxUses: 5,
        uses: 0,
      },
    )
    expect(guildClient.createGuildInvite).toHaveBeenCalledWith({
      expiresInMs: 86_400_000n,
      guildId: 42n,
      maxUses: 5,
    })

    await expect(deleteGuildInvite('cordis-hello')).resolves.toBeUndefined()
    expect(guildClient.deleteGuildInvite).toHaveBeenCalledWith({ code: 'cordis-hello' })
  })

  it('maps invite preview and join responses into the application boundary', async () => {
    guildClient.getGuildInvite.mockResolvedValue({
      preview: {
        code: 'cordis-hello',
        expiresAt: 0n,
        guildDescription: 'A community for thoughtful tools.',
        guildIconAssetId: 9n,
        guildId: 42n,
        guildName: 'Cordis Studio',
        memberCount: 12n,
      },
    })
    guildClient.joinGuildByInvite.mockResolvedValue({
      guild: {
        createdAt: 1_000n,
        description: 'A community for thoughtful tools.',
        iconAssetId: 9n,
        id: 42n,
        name: 'Cordis Studio',
        ownerId: 7n,
        revision: 1n,
        updatedAt: 1_000n,
      },
      member: {
        guildId: 42n,
        joinedAt: 2_000n,
        nickname: '',
        profile: {
          avatarAssetId: 0n,
          createdAt: 500n,
          name: 'Sam Rivera',
          updatedAt: 1_000n,
          userId: 8n,
          username: 'sam_rivera',
        },
        revision: 1n,
        updatedAt: 2_000n,
        userId: 8n,
      },
    })

    await expect(getGuildInvite('  cordis-hello  ')).resolves.toEqual({
      code: 'cordis-hello',
      expiresAt: 0,
      guildDescription: 'A community for thoughtful tools.',
      guildIconAssetId: '9',
      guildId: '42',
      guildName: 'Cordis Studio',
      memberCount: 12,
    })
    expect(guildClient.getGuildInvite).toHaveBeenCalledWith({ code: 'cordis-hello' })

    await expect(joinGuildByInvite('cordis-hello')).resolves.toEqual({
      guild: {
        createdAt: 1_000,
        description: 'A community for thoughtful tools.',
        iconAssetId: '9',
        id: '42',
        name: 'Cordis Studio',
        ownerId: '7',
        revision: 1,
        updatedAt: 1_000,
      },
      member: {
        guildId: '42',
        joinedAt: 2_000,
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
        updatedAt: 2_000,
        userId: '8',
      },
    })
    expect(guildClient.joinGuildByInvite).toHaveBeenCalledWith({ code: 'cordis-hello' })
  })

  it('rejects invalid invite inputs before calling the API', async () => {
    await expect(listGuildInvites('not-an-id')).rejects.toThrow('guild id is invalid')
    await expect(createGuildInvite('42', { expiresInMs: -1, maxUses: 0 })).rejects.toThrow(
      'expires in ms is invalid',
    )
    await expect(createGuildInvite('42', { expiresInMs: 0, maxUses: -1 })).rejects.toThrow(
      'max uses is invalid',
    )
    await expect(deleteGuildInvite('  ')).rejects.toThrow('invite code is invalid')
    await expect(getGuildInvite('  ')).rejects.toThrow('invite code is invalid')
    await expect(joinGuildByInvite('')).rejects.toThrow('invite code is invalid')
    expect(guildClient.listGuildInvites).not.toHaveBeenCalled()
    expect(guildClient.createGuildInvite).not.toHaveBeenCalled()
    expect(guildClient.deleteGuildInvite).not.toHaveBeenCalled()
    expect(guildClient.getGuildInvite).not.toHaveBeenCalled()
    expect(guildClient.joinGuildByInvite).not.toHaveBeenCalled()
  })
})

function roleMessage(
  overrides: Partial<{
    isDefault: boolean
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
