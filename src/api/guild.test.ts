import { beforeEach, describe, expect, it, vi } from 'vitest'

const guildClient = vi.hoisted(() => ({
  createGuild: vi.fn(),
  createGuildChannel: vi.fn(),
  listGuildChannels: vi.fn(),
}))

vi.mock('@connectrpc/connect', () => ({
  createClient: () => guildClient,
}))
vi.mock('./client', () => ({ apiTransport: {} }))

import { createGuildChannel, listGuildChannels } from './guild'

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
})
