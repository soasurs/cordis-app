import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import { syncGatewayDispatch, clearGatewayQueries } from '@/app/gateway-query-sync'
import {
  bumpChannelLastMessageId,
  channelReadStatesQueryKey,
  compareSnowflakeId,
  isChannelUnread,
  markChannelReadThrough,
  replaceChannelReadStatesFromReady,
  type ChannelReadStatesMap,
} from '@/features/messages/read-state-queries'

describe('read-state helpers', () => {
  it('compares snowflake ids and detects unread channels', () => {
    expect(compareSnowflakeId('10', '2')).toBe(1)
    expect(compareSnowflakeId('2', '10')).toBe(-1)
    expect(compareSnowflakeId('10', '10')).toBe(0)
    expect(
      isChannelUnread({
        channelId: '43',
        lastMessageId: '200',
        lastReadMessageId: '150',
        mentionCount: 0,
      }),
    ).toBe(true)
    expect(
      isChannelUnread({
        channelId: '43',
        lastMessageId: '150',
        lastReadMessageId: '150',
        mentionCount: 1,
      }),
    ).toBe(false)
  })

  it('marks read through without lowering cursors', () => {
    const queryClient = new QueryClient()
    replaceChannelReadStatesFromReady(queryClient, [
      {
        channel_id: '43',
        last_message_id: '200',
        last_read_message_id: '100',
        mention_count: 2,
      },
    ])

    markChannelReadThrough(queryClient, '43', '150')
    expect(queryClient.getQueryData(channelReadStatesQueryKey())).toEqual({
      '43': {
        channelId: '43',
        lastMessageId: '200',
        lastReadMessageId: '150',
        mentionCount: 0,
      },
    })

    bumpChannelLastMessageId(queryClient, '43', '120')
    expect(
      queryClient.getQueryData<ChannelReadStatesMap>(channelReadStatesQueryKey())?.['43']
        ?.lastMessageId,
    ).toBe('200')
    bumpChannelLastMessageId(queryClient, '43', '250')
    expect(
      queryClient.getQueryData<ChannelReadStatesMap>(channelReadStatesQueryKey())?.['43']
        ?.lastMessageId,
    ).toBe('250')
  })
})

describe('syncGatewayDispatch read states', () => {
  it('hydrates ready read states and applies live updates', () => {
    const queryClient = new QueryClient()

    syncGatewayDispatch(queryClient, {
      type: 'ready',
      sequence: 1,
      data: {
        access_token_expires_at: 9_000,
        auth_session_id: 'auth',
        dm_channels: [],
        guilds: [],
        presence_preference: {
          status: 'online',
          version: '1',
        },
        presences: [],
        read_states: [
          {
            channel_id: '43',
            last_message_id: '100',
            last_read_message_id: '100',
            mention_count: 0,
          },
        ],
        session_id: 'session',
        session_node_id: 'node',
        user_id: '7',
      },
    })

    expect(queryClient.getQueryData(channelReadStatesQueryKey())).toEqual({
      '43': {
        channelId: '43',
        lastMessageId: '100',
        lastReadMessageId: '100',
        mentionCount: 0,
      },
    })

    syncGatewayDispatch(queryClient, {
      type: 'message.created',
      sequence: 2,
      data: {
        attachments: [],
        author: {
          avatar_asset_id: '0',
          created_at: 1_000,
          name: 'Alex',
          updated_at: 1_000,
          user_id: '8',
          username: 'alex',
        },
        channel_id: '43',
        content: 'hi',
        created_at: 2_000,
        edited_at: 0,
        flags: 0,
        id: '200',
        mention_user_ids: [],
        revision: 1,
        type: 1,
        updated_at: 2_000,
      },
    })

    expect(
      queryClient.getQueryData<ChannelReadStatesMap>(channelReadStatesQueryKey())?.['43'],
    ).toEqual({
      channelId: '43',
      lastMessageId: '200',
      lastReadMessageId: '100',
      mentionCount: 0,
    })

    syncGatewayDispatch(queryClient, {
      type: 'message.read.updated',
      sequence: 3,
      data: {
        channel_id: '43',
        last_message_id: '200',
        last_read_message_id: '200',
        mention_count: 0,
        user_id: '7',
      },
    })

    expect(
      queryClient.getQueryData<ChannelReadStatesMap>(channelReadStatesQueryKey())?.['43']
        ?.lastReadMessageId,
    ).toBe('200')

    syncGatewayDispatch(queryClient, {
      type: 'message.deleted',
      sequence: 4,
      data: {
        channel_id: '43',
        deleted_at: 3_000,
        id: '200',
        last_message_id: '100',
        mention_user_ids: [],
        revision: 2,
      },
    })

    expect(
      queryClient.getQueryData<ChannelReadStatesMap>(channelReadStatesQueryKey())?.['43']
        ?.lastMessageId,
    ).toBe('100')

    clearGatewayQueries(queryClient)
    expect(queryClient.getQueryData(channelReadStatesQueryKey())).toBeUndefined()
  })
})
