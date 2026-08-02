import { beforeEach, describe, expect, it, vi } from 'vitest'

const messageClient = vi.hoisted(() => ({
  createDmChannel: vi.fn(),
  listDmChannels: vi.fn(),
}))

vi.mock('@connectrpc/connect', () => ({
  createClient: () => messageClient,
}))
vi.mock('@/api/client', () => ({ apiTransport: {} }))

import { createDmChannel, listDmChannels } from '@/api/dm'

const sampleRecipient = {
  avatarAssetId: 11n,
  bio: 'Hello',
  createdAt: 1_000n,
  name: 'Alex Chen',
  updatedAt: 1_000n,
  userId: 7n,
  username: 'alex_chen',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('dm API', () => {
  it('maps created DM channels into decimal string ids', async () => {
    messageClient.createDmChannel.mockResolvedValue({
      channel: {
        createdAt: 2_000n,
        id: 43n,
        recipient: sampleRecipient,
        recipientId: 7n,
      },
    })

    await expect(createDmChannel('7')).resolves.toEqual({
      channelId: '43',
      createdAt: 2_000,
      recipient: {
        avatarAssetId: '11',
        bio: 'Hello',
        createdAt: 1_000,
        name: 'Alex Chen',
        updatedAt: 1_000,
        userId: '7',
        username: 'alex_chen',
      },
    })
    expect(messageClient.createDmChannel).toHaveBeenCalledWith({ targetId: 7n })
  })

  it('lists DM channels and passes the cursor through', async () => {
    messageClient.listDmChannels.mockResolvedValue({
      channels: [
        {
          createdAt: 2_000n,
          id: 43n,
          recipient: sampleRecipient,
          recipientId: 7n,
        },
      ],
      nextCursor: 'next-page',
    })

    await expect(listDmChannels('next-page')).resolves.toEqual({
      channels: [expect.objectContaining({ channelId: '43' })],
      nextCursor: 'next-page',
    })
    expect(messageClient.listDmChannels).toHaveBeenCalledWith({
      cursor: 'next-page',
      limit: 50,
    })
  })

  it('omits the cursor and end-of-list marker on the first page', async () => {
    messageClient.listDmChannels.mockResolvedValue({
      channels: [],
      nextCursor: '',
    })

    await expect(listDmChannels()).resolves.toEqual({
      channels: [],
      nextCursor: undefined,
    })
    expect(messageClient.listDmChannels).toHaveBeenCalledWith({ limit: 50 })
  })

  it('rejects invalid target ids', async () => {
    await expect(createDmChannel('alex')).rejects.toThrow('target id is invalid')
    await expect(createDmChannel('0')).rejects.toThrow('target id is invalid')
    expect(messageClient.createDmChannel).not.toHaveBeenCalled()
  })
})
