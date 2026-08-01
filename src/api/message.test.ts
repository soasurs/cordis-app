import { beforeEach, describe, expect, it, vi } from 'vitest'

const messageClient = vi.hoisted(() => ({
  abortAttachmentUpload: vi.fn(),
  ackMessage: vi.fn(),
  completeAttachmentUpload: vi.fn(),
  createAttachmentUpload: vi.fn(),
  createMessage: vi.fn(),
  deleteMessage: vi.fn(),
  getMessage: vi.fn(),
  getReadStates: vi.fn(),
  listMessages: vi.fn(),
  updateMessage: vi.fn(),
}))

vi.mock('@connectrpc/connect', () => ({
  createClient: () => messageClient,
}))
vi.mock('@/api/client', () => ({ apiTransport: {} }))

import {
  abortAttachmentUpload,
  ackMessage,
  completeAttachmentUpload,
  createAttachmentUpload,
  createMessage,
  deleteMessage,
  getMessage,
  getReadStatesForGuild,
  listMessages,
  updateMessage,
} from '@/api/message'

const sampleAuthor = {
  avatarAssetId: 0n,
  createdAt: 1_000n,
  name: 'Alex',
  updatedAt: 1_000n,
  userId: 7n,
  username: 'alex',
}

const sampleAttachment = {
  assetId: 900n,
  contentType: 'image/png',
  filename: 'shot.png',
  height: 100,
  size: 12n,
  url: 'https://cdn.example.com/shot.png',
  urlExpiresAt: 0n,
  width: 200,
}

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
          attachments: [sampleAttachment],
          author: {
            avatarAssetId: 11n,
            bio: '',
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
          mentionEveryone: true,
          mentionRoleIds: [50n],
          mentionUserIds: [7n],
          referencedChannelId: 0n,
          referencedMessageId: 0n,
          revision: 1n,
          type: 1,
          updatedAt: 2_000n,
        },
        {
          attachments: [],
          author: {
            avatarAssetId: 0n,
            bio: '',
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
          attachments: [
            {
              assetId: '900',
              contentType: 'image/png',
              filename: 'shot.png',
              height: 100,
              size: 12,
              url: 'https://cdn.example.com/shot.png',
              urlExpiresAt: 0,
              width: 200,
            },
          ],
          author: {
            avatarAssetId: '11',
            bio: '',
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
          mentionEveryone: true,
          mentionRoleIds: ['50'],
          mentionUserIds: ['7'],
          referencedChannelId: undefined,
          referencedMessageId: undefined,
          revision: 1,
          type: 1,
          updatedAt: 2_000,
        },
        {
          attachments: [],
          author: {
            avatarAssetId: '0',
            bio: '',
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
          mentionEveryone: false,
          mentionRoleIds: [],
          mentionUserIds: [],
          referencedChannelId: undefined,
          referencedMessageId: undefined,
          revision: 1,
          type: 1,
          updatedAt: 1_500,
        },
      ],
    })
  })

  it('lists messages around a cursor', async () => {
    messageClient.listMessages.mockResolvedValue({
      afterCursor: 110n,
      beforeCursor: 90n,
      messages: [],
    })

    await listMessages('43', { around: '100' })
    expect(messageClient.listMessages).toHaveBeenCalledWith({
      channelId: 43n,
      cursor: { case: 'around', value: 100n },
      limit: 20,
    })
  })

  it('rejects mutually exclusive list cursors', async () => {
    await expect(listMessages('43', { before: '100', around: '90' })).rejects.toThrow(
      'message list cursors are mutually exclusive',
    )
    expect(messageClient.listMessages).not.toHaveBeenCalled()
  })

  it('creates messages with attachments and allows attachment-only content', async () => {
    messageClient.createMessage.mockResolvedValue({
      message: {
        attachments: [sampleAttachment],
        author: sampleAuthor,
        channelId: 43n,
        content: '',
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

    await expect(
      createMessage({
        attachmentAssetIds: ['900'],
        channelId: '43',
        content: '',
        idempotencyKey: 'message-intent',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        attachments: [expect.objectContaining({ assetId: '900', filename: 'shot.png' })],
        content: '',
        id: '200',
      }),
    )
    expect(messageClient.createMessage).toHaveBeenCalledWith({
      attachments: [{ assetId: 900n }],
      channelId: 43n,
      content: '',
      idempotencyKey: 'message-intent',
      type: 1,
    })
  })

  it('rejects empty create without attachments', async () => {
    await expect(createMessage({ channelId: '43', content: '   ' })).rejects.toThrow(
      'message content or attachments are required',
    )
    expect(messageClient.createMessage).not.toHaveBeenCalled()
  })

  it('creates reply messages with both reference ids', async () => {
    messageClient.createMessage.mockResolvedValue({
      message: {
        attachments: [],
        author: sampleAuthor,
        channelId: 43n,
        content: 'Agreed',
        createdAt: 4_000n,
        editedAt: 0n,
        flags: 0,
        id: 201n,
        referencedChannelId: 43n,
        referencedMessageId: 102n,
        revision: 1n,
        type: 19,
        updatedAt: 4_000n,
      },
    })

    await expect(
      createMessage({
        channelId: '43',
        content: 'Agreed',
        referencedChannelId: '43',
        referencedMessageId: '102',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: '201',
        referencedChannelId: '43',
        referencedMessageId: '102',
        type: 19,
      }),
    )
    expect(messageClient.createMessage).toHaveBeenCalledWith({
      attachments: [],
      channelId: 43n,
      content: 'Agreed',
      referencedChannelId: 43n,
      referencedMessageId: 102n,
      type: 19,
    })
  })

  it('rejects reply creates with only one reference id', async () => {
    await expect(
      createMessage({
        channelId: '43',
        content: 'Agreed',
        referencedMessageId: '102',
      }),
    ).rejects.toThrow('reply requires both referenced message and channel ids')
    expect(messageClient.createMessage).not.toHaveBeenCalled()
  })

  it('loads a single message by id', async () => {
    messageClient.getMessage.mockResolvedValue({
      message: {
        attachments: [],
        author: sampleAuthor,
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
    })

    await expect(getMessage('102')).resolves.toEqual(
      expect.objectContaining({ channelId: '43', content: 'Hello', id: '102' }),
    )
    expect(messageClient.getMessage).toHaveBeenCalledWith({ messageId: 102n })
  })

  it('maps attachment upload create/complete/abort', async () => {
    messageClient.createAttachmentUpload.mockResolvedValue({
      expiresAt: 9_000n,
      idempotentReplay: false,
      presignedUrl: 'https://upload.example.com/put',
      requestHeaders: { 'Content-Type': 'application/pdf' },
      status: 1,
      uploadId: 55n,
    })
    messageClient.completeAttachmentUpload.mockResolvedValue({
      attachment: {
        ...sampleAttachment,
        assetId: 55n,
        contentType: 'application/pdf',
        filename: 'notes.pdf',
        height: 0,
        width: 0,
      },
    })
    messageClient.abortAttachmentUpload.mockResolvedValue({})

    await expect(
      createAttachmentUpload('43', {
        contentType: 'application/pdf',
        expectedSize: 100,
        filename: 'notes.pdf',
        idempotencyKey: 'attachment-intent',
      }),
    ).resolves.toEqual({
      expiresAt: 9_000,
      idempotentReplay: false,
      presignedUrl: 'https://upload.example.com/put',
      requestHeaders: { 'Content-Type': 'application/pdf' },
      status: 'created',
      uploadId: '55',
    })
    await expect(completeAttachmentUpload('43', '55')).resolves.toEqual(
      expect.objectContaining({ assetId: '55', contentType: 'application/pdf' }),
    )
    await expect(abortAttachmentUpload('43', '55')).resolves.toBeUndefined()
  })

  it('updates and deletes messages by id', async () => {
    messageClient.updateMessage.mockResolvedValue({
      message: {
        attachments: [],
        author: sampleAuthor,
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
    expect(messageClient.updateMessage).toHaveBeenCalledWith({
      content: 'Edited',
      messageId: 200n,
    })

    messageClient.updateMessage.mockResolvedValue({
      message: {
        attachments: [sampleAttachment],
        author: sampleAuthor,
        channelId: 43n,
        content: '',
        createdAt: 3_000n,
        editedAt: 5_000n,
        flags: 0,
        id: 200n,
        referencedChannelId: 0n,
        referencedMessageId: 0n,
        revision: 3n,
        type: 1,
        updatedAt: 5_000n,
      },
    })

    await expect(
      updateMessage('200', { attachmentAssetIds: ['900'], content: '' }),
    ).resolves.toEqual(
      expect.objectContaining({
        attachments: [expect.objectContaining({ assetId: '900' })],
        content: '',
        revision: 3,
      }),
    )
    expect(messageClient.updateMessage).toHaveBeenLastCalledWith({
      attachments: { attachments: [{ assetId: 900n }] },
      content: '',
      messageId: 200n,
    })

    await expect(updateMessage('200', { attachmentAssetIds: [], content: '' })).rejects.toThrow(
      'message content or attachments are required',
    )
    await expect(deleteMessage('200')).resolves.toBeUndefined()
  })

  it('rejects invalid identifiers', async () => {
    await expect(listMessages('abc')).rejects.toThrow('channel id is invalid')
    await expect(deleteMessage('x')).rejects.toThrow('message id is invalid')
  })

  it('acks a message and loads guild read states', async () => {
    messageClient.ackMessage.mockResolvedValue({
      readState: {
        channelId: 43n,
        lastMessageId: 200n,
        lastReadMessageId: 200n,
        mentionCount: 0,
      },
    })
    messageClient.getReadStates.mockResolvedValue({
      dmChannels: [],
      readStates: [
        {
          channelId: 43n,
          lastMessageId: 200n,
          lastReadMessageId: 150n,
          mentionCount: 2,
        },
      ],
    })

    await expect(ackMessage('43', '200')).resolves.toEqual({
      channelId: '43',
      lastMessageId: '200',
      lastReadMessageId: '200',
      mentionCount: 0,
    })
    expect(messageClient.ackMessage).toHaveBeenCalledWith({
      channelId: 43n,
      messageId: 200n,
    })

    await expect(getReadStatesForGuild('42')).resolves.toEqual([
      {
        channelId: '43',
        lastMessageId: '200',
        lastReadMessageId: '150',
        mentionCount: 2,
      },
    ])
    expect(messageClient.getReadStates).toHaveBeenCalledWith({
      guildId: 42n,
      scope: 1,
    })
  })
})
