import { beforeEach, describe, expect, it, vi } from 'vitest'

const messageClient = vi.hoisted(() => ({
  createMessage: vi.fn(),
  deleteMessage: vi.fn(),
  listMessages: vi.fn(),
  updateMessage: vi.fn(),
}))

vi.mock('@connectrpc/connect', () => ({
  createClient: () => messageClient,
}))
vi.mock('@/api/client', () => ({ apiTransport: {} }))

import {
  createMessage,
  deleteMessage,
  listMessages,
  updateMessage,
} from '@/api/message'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('message API', () => {
  it('maps list messages into the application boundary', async () => {
    messageClient.listMessages.mockResolvedValue({
      afterCursor: 102n,
      beforeCursor: 101n,
      messages: [
        {
          author: {
            avatarAssetId: 11n,
            createdAt: 1_000n,
            name: 'Alex Chen',
            updatedAt: 1_000n,
            userId: 7n,
            username: 'alex_chen',
          },
          channelId: 43n,
          content: 'Hello',
          createdAt: 2_000n,
          editedAt: 0n,
          flags: 0,
          id: 102n,
          referencedChannelId: 0n,
          referencedMessageId: 0n,
          revision: 1n,
          type: 1,
          updatedAt: 2_000n,
        },
        {
          author: {
            avatarAssetId: 0n,
            createdAt: 1_000n,
            name: 'Maya',
            updatedAt: 1_000n,
            userId: 8n,
            username: 'maya',
          },
          channelId: 43n,
          content: 'Earlier',
          createdAt: 1_500n,
          editedAt: 0n,
          flags: 0,
          id: 101n,
          referencedChannelId: 0n,
          referencedMessageId: 0n,
          revision: 1n,
          type: 1,
          updatedAt: 1_500n,
        },
      ],
    })

    await expect(listMessages('43')).resolves.toEqual({
      afterCursor: '102',
      beforeCursor: '101',
      messages: [
        {
          author: {
            avatarAssetId: '11',
            createdAt: 1_000,
            name: 'Alex Chen',
            updatedAt: 1_000,
            userId: '7',
            username: 'alex_chen',
          },
          channelId: '43',
          content: 'Hello',
          createdAt: 2_000,
          editedAt: 0,
          flags: 0,
          id: '102',
          referencedChannelId: undefined,
          referencedMessageId: undefined,
          revision: 1,
          type: 1,
          updatedAt: 2_000,
        },
        {
          author: {
            avatarAssetId: '0',
            createdAt: 1_000,
            name: 'Maya',
            updatedAt: 1_000,
            userId: '8',
            username: 'maya',
          },
          channelId: '43',
          content: 'Earlier',
          createdAt: 1_500,
          editedAt: 0,
          flags: 0,
          id: '101',
          referencedChannelId: undefined,
          referencedMessageId: undefined,
          revision: 1,
          type: 1,
          updatedAt: 1_500,
        },
      ],
    })
    expect(messageClient.listMessages).toHaveBeenCalledWith({
      channelId: 43n,
      limit: 50,
    })
  })

  it('passes before cursor when loading older messages', async () => {
    messageClient.listMessages.mockResolvedValue({
      afterCursor: 0n,
      beforeCursor: 0n,
      messages: [],
    })

    await listMessages('43', { before: '101', limit: 25 })

    expect(messageClient.listMessages).toHaveBeenCalledWith({
      channelId: 43n,
      cursor: { case: 'before', value: 101n },
      limit: 25,
    })
  })

  it('creates a default text message', async () => {
    messageClient.createMessage.mockResolvedValue({
      message: {
        author: {
          avatarAssetId: 0n,
          createdAt: 1_000n,
          name: 'Alex',
          updatedAt: 1_000n,
          userId: 7n,
          username: 'alex',
        },
        channelId: 43n,
        content: 'Ship it',
        createdAt: 3_000n,
        editedAt: 0n,
        flags: 0,
        id: 200n,
        referencedChannelId: 0n,
        referencedMessageId: 0n,
        revision: 1n,
        type: 1,
        updatedAt: 3_000n,
      },
    })

    await expect(createMessage({ channelId: '43', content: '  Ship it  ' })).resolves.toEqual(
      expect.objectContaining({
        channelId: '43',
        content: 'Ship it',
        id: '200',
      }),
    )
    expect(messageClient.createMessage).toHaveBeenCalledWith({
      channelId: 43n,
      content: 'Ship it',
      type: 1,
    })
  })

  it('rejects empty create and update content', async () => {
    await expect(createMessage({ channelId: '43', content: '   ' })).rejects.toThrow(
      'message content is required',
    )
    await expect(updateMessage('200', { content: '' })).rejects.toThrow(
      'message content is required',
    )
    expect(messageClient.createMessage).not.toHaveBeenCalled()
    expect(messageClient.updateMessage).not.toHaveBeenCalled()
  })

  it('updates and deletes messages by id', async () => {
    messageClient.updateMessage.mockResolvedValue({
      message: {
        author: {
          avatarAssetId: 0n,
          createdAt: 1_000n,
          name: 'Alex',
          updatedAt: 1_000n,
          userId: 7n,
          username: 'alex',
        },
        channelId: 43n,
        content: 'Edited',
        createdAt: 3_000n,
        editedAt: 4_000n,
        flags: 0,
        id: 200n,
        referencedChannelId: 0n,
        referencedMessageId: 0n,
        revision: 2n,
        type: 1,
        updatedAt: 4_000n,
      },
    })
    messageClient.deleteMessage.mockResolvedValue({ ok: true })

    await expect(updateMessage('200', { content: 'Edited' })).resolves.toEqual(
      expect.objectContaining({ content: 'Edited', editedAt: 4_000, revision: 2 }),
    )
    await expect(deleteMessage('200')).resolves.toBeUndefined()
    expect(messageClient.updateMessage).toHaveBeenCalledWith({
      content: 'Edited',
      messageId: 200n,
    })
    expect(messageClient.deleteMessage).toHaveBeenCalledWith({ messageId: 200n })
  })

  it('rejects invalid identifiers', async () => {
    await expect(listMessages('abc')).rejects.toThrow('channel id is invalid')
    await expect(deleteMessage('x')).rejects.toThrow('message id is invalid')
  })
})
