import { QueryClient, type InfiniteData } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const messageApi = vi.hoisted(() => ({
  getMessage: vi.fn(),
  listMessages: vi.fn(),
}))

vi.mock('@/api/message', async () => {
  const actual = await vi.importActual<typeof import('@/api/message')>('@/api/message')
  return {
    ...actual,
    getMessage: messageApi.getMessage,
    listMessages: messageApi.listMessages,
  }
})

import type { ChannelMessagePage } from '@/api/message'
import {
  channelHasNewerMessages,
  channelMessagesQueryKey,
  findChannelMessageInCache,
  flattenMessagesChronological,
  loadNewerChannelMessages,
  patchChannelMessageFromGateway,
  removeChannelMessageFromApi,
  removeChannelMessageFromGateway,
  replaceChannelMessagesPage,
  upsertChannelMessageFromApi,
  upsertChannelMessageFromGateway,
  type ChannelMessageSummary,
} from '@/features/messages/message-queries'

const older: ChannelMessageSummary = {
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
  revision: 1,
  type: 1,
  updatedAt: 1_500,
}

const newer: ChannelMessageSummary = {
  attachments: [],
  author: {
    avatarAssetId: '0',
    bio: '',
    createdAt: 1_000,
    name: 'Alex',
    updatedAt: 1_000,
    userId: '7',
    username: 'alex',
  },
  channelId: '43',
  content: 'Hello',
  createdAt: 2_000,
  editedAt: 0,
  flags: 0,
  id: '102',
  revision: 1,
  type: 1,
  updatedAt: 2_000,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('message query helpers', () => {
  it('flattens newest-first pages into chronological order', () => {
    const data: InfiniteData<ChannelMessagePage> = {
      pageParams: [undefined],
      pages: [{ beforeCursor: '101', messages: [newer, older] }],
    }

    expect(flattenMessagesChronological(data).map((item) => item.id)).toEqual(['101', '102'])
  })

  it('finds a message inside the channel infinite cache', () => {
    const queryClient = new QueryClient()
    seedMessages(queryClient, [newer, older])

    expect(findChannelMessageInCache(queryClient, '43', '101')).toEqual(older)
    expect(findChannelMessageInCache(queryClient, '43', '999')).toBeUndefined()
  })

  it('replaces the channel timeline with an around page', () => {
    const queryClient = new QueryClient()
    seedMessages(queryClient, [newer, older])

    replaceChannelMessagesPage(queryClient, '43', {
      afterCursor: '50',
      beforeCursor: '40',
      messages: [{ ...older, id: '50', content: 'Around' }],
    })

    expect(messageIds(queryClient)).toEqual(['50'])
    expect(findChannelMessageInCache(queryClient, '43', '50')?.content).toBe('Around')
  })

  it('loads newer messages after an around jump and clears the tip cursor', async () => {
    const queryClient = new QueryClient()
    replaceChannelMessagesPage(queryClient, '43', {
      afterCursor: '50',
      beforeCursor: '40',
      messages: [{ ...older, id: '50', content: 'Around' }],
    })

    messageApi.listMessages.mockResolvedValueOnce({
      afterCursor: '60',
      beforeCursor: '51',
      messages: [{ ...newer, id: '60', content: 'Later' }],
    })

    await expect(loadNewerChannelMessages(queryClient, '43')).resolves.toEqual({ loaded: true })
    expect(messageIds(queryClient)).toEqual(['60', '50'])
    expect(channelHasNewerMessages(queryClient.getQueryData(channelMessagesQueryKey('43')))).toBe(
      true,
    )
    expect(messageApi.listMessages).toHaveBeenCalledWith('43', { after: '50' })

    messageApi.listMessages.mockResolvedValueOnce({
      afterCursor: undefined,
      beforeCursor: undefined,
      messages: [],
    })
    await expect(loadNewerChannelMessages(queryClient, '43')).resolves.toEqual({ loaded: false })
    expect(channelHasNewerMessages(queryClient.getQueryData(channelMessagesQueryKey('43')))).toBe(
      false,
    )
  })

  it('prepends created messages and replaces updates by revision', () => {
    const queryClient = new QueryClient()
    seedMessages(queryClient, [newer])

    upsertChannelMessageFromApi(queryClient, {
      ...older,
      id: '103',
      content: 'Newest',
      createdAt: 3_000,
      updatedAt: 3_000,
    })

    expect(messageIds(queryClient)).toEqual(['103', '102'])

    upsertChannelMessageFromApi(queryClient, {
      ...newer,
      content: 'Hello edited',
      editedAt: 4_000,
      revision: 2,
      updatedAt: 4_000,
    })

    expect(getMessages(queryClient).find((item) => item.id === '102')?.content).toBe('Hello edited')

    upsertChannelMessageFromApi(queryClient, {
      ...newer,
      content: 'Stale',
      revision: 1,
    })

    expect(getMessages(queryClient).find((item) => item.id === '102')?.content).toBe('Hello edited')
  })

  it('removes messages from the infinite cache', () => {
    const queryClient = new QueryClient()
    seedMessages(queryClient, [newer, older])

    removeChannelMessageFromApi(queryClient, '43', '102')

    expect(messageIds(queryClient)).toEqual(['101'])
  })

  it('ignores gateway events when the channel cache is cold', () => {
    const queryClient = new QueryClient()

    upsertChannelMessageFromGateway(queryClient, {
      attachments: [],
      author: {
        avatar_asset_id: '0',
        bio: '',
        created_at: 1_000,
        name: 'Alex',
        updated_at: 1_000,
        user_id: '7',
        username: 'alex',
      },
      channel_id: '43',
      content: 'Hello',
      created_at: 2_000,
      edited_at: 0,
      flags: 0,
      id: '102',
      mention_user_ids: [],
      revision: 1,
      type: 1,
      updated_at: 2_000,
    })

    expect(queryClient.getQueryData(channelMessagesQueryKey('43'))).toBeUndefined()
  })

  it('applies gateway create and delete when the cache is warm', () => {
    const queryClient = new QueryClient()
    seedMessages(queryClient, [older])

    upsertChannelMessageFromGateway(queryClient, {
      attachments: [],
      author: {
        avatar_asset_id: '0',
        bio: '',
        created_at: 1_000,
        name: 'Alex',
        updated_at: 1_000,
        user_id: '7',
        username: 'alex',
      },
      channel_id: '43',
      content: 'Hello',
      created_at: 2_000,
      edited_at: 0,
      flags: 0,
      id: '102',
      mention_user_ids: [],
      revision: 1,
      type: 1,
      updated_at: 2_000,
    })

    expect(messageIds(queryClient)).toEqual(['102', '101'])

    removeChannelMessageFromGateway(queryClient, {
      channel_id: '43',
      deleted_at: 5_000,
      id: '101',
      last_message_id: '102',
      mention_user_ids: [],
      revision: 1,
    })

    expect(messageIds(queryClient)).toEqual(['102'])
  })

  it('ignores gateway updates for messages that are not loaded', () => {
    const queryClient = new QueryClient()
    seedMessages(queryClient, [older])

    patchChannelMessageFromGateway(queryClient, {
      attachments: [],
      author: {
        avatar_asset_id: '0',
        bio: '',
        created_at: 1_000,
        name: 'Alex',
        updated_at: 1_000,
        user_id: '7',
        username: 'alex',
      },
      channel_id: '43',
      content: 'Unloaded edit',
      created_at: 2_000,
      edited_at: 3_000,
      flags: 0,
      id: '999',
      mention_user_ids: [],
      revision: 2,
      type: 1,
      updated_at: 3_000,
    })

    expect(messageIds(queryClient)).toEqual(['101'])
  })

  it('maps gateway attachments onto message summaries', () => {
    const queryClient = new QueryClient()
    seedMessages(queryClient, [older])

    upsertChannelMessageFromGateway(queryClient, {
      attachments: [
        {
          asset_id: '900',
          content_type: 'image/png',
          filename: 'shot.png',
          height: 10,
          size: 12,
          url: 'https://cdn.example.com/shot.png',
          url_expires_at: 0,
          width: 20,
        },
      ],
      author: {
        avatar_asset_id: '0',
        bio: '',
        created_at: 1_000,
        name: 'Alex',
        updated_at: 1_000,
        user_id: '7',
        username: 'alex',
      },
      channel_id: '43',
      content: 'With image',
      created_at: 2_000,
      edited_at: 0,
      flags: 0,
      id: '102',
      mention_user_ids: [],
      revision: 1,
      type: 1,
      updated_at: 2_000,
    })

    expect(getMessages(queryClient)[0]?.attachments).toEqual([
      {
        assetId: '900',
        contentType: 'image/png',
        filename: 'shot.png',
        height: 10,
        size: 12,
        url: 'https://cdn.example.com/shot.png',
        urlExpiresAt: 0,
        width: 20,
      },
    ])
  })
})

function seedMessages(queryClient: QueryClient, messages: ChannelMessageSummary[]) {
  queryClient.setQueryData<InfiniteData<ChannelMessagePage>>(channelMessagesQueryKey('43'), {
    pageParams: [undefined],
    pages: [{ beforeCursor: messages.at(-1)?.id, messages }],
  })
}

function getMessages(queryClient: QueryClient) {
  const data = queryClient.getQueryData<InfiniteData<ChannelMessagePage>>(
    channelMessagesQueryKey('43'),
  )
  return data?.pages.flatMap((page) => page.messages) ?? []
}

function messageIds(queryClient: QueryClient) {
  return getMessages(queryClient).map((item) => item.id)
}
