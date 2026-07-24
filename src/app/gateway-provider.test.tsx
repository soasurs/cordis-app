import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  GatewayClientError,
  type GatewayConnectionState,
  type GatewayDispatch,
  type GatewayStateChange,
} from '@/gateway'
import {
  guildChannelsQueryKey,
  guildsQueryKey,
  type GuildChannelSummary,
  type GuildSummary,
} from '@/features/guilds/guild-queries'

import { gatewayReadyQueryKey, useGatewayStatus } from './gateway-context'
import { GatewayProvider } from './gateway-provider'

class FakeGatewayConnection {
  state: GatewayConnectionState = 'idle'
  private readonly dispatchListeners = new Set<(dispatch: GatewayDispatch) => void>()
  private readonly errorListeners = new Set<(error: GatewayClientError) => void>()
  private readonly stateListeners = new Set<(change: GatewayStateChange) => void>()

  connect = vi.fn(() => this.setState('connecting'))
  disconnect = vi.fn(() => this.setState('idle'))

  onDispatch(listener: (dispatch: GatewayDispatch) => void) {
    this.dispatchListeners.add(listener)
    return () => this.dispatchListeners.delete(listener)
  }

  onError(listener: (error: GatewayClientError) => void) {
    this.errorListeners.add(listener)
    return () => this.errorListeners.delete(listener)
  }

  onStateChange(listener: (change: GatewayStateChange) => void) {
    this.stateListeners.add(listener)
    return () => this.stateListeners.delete(listener)
  }

  dispatch(dispatch: GatewayDispatch) {
    for (const listener of this.dispatchListeners) {
      listener(dispatch)
    }
  }

  fail(code: string) {
    for (const listener of this.errorListeners) {
      listener(new GatewayClientError(code, 'gateway test error'))
    }
  }

  setState(current: GatewayConnectionState) {
    const previous = this.state
    this.state = current
    for (const listener of this.stateListeners) {
      listener({ current, previous })
    }
  }
}

function GatewayStatusProbe() {
  const status = useGatewayStatus()
  return <p>{`${status.state}:${status.errorCode ?? 'none'}`}</p>
}

const readyData = {
  access_token_expires_at: 10_000,
  auth_session_id: 'auth-session',
  dm_channels: [],
  guilds: [
    {
      access_revision: 1,
      channels: [
        {
          created_at: 1_000,
          guild_id: '42',
          id: '43',
          name: 'general',
          position: 0,
          revision: 1,
          topic: '',
          type: 1,
          updated_at: 1_000,
        },
      ],
      created_at: 1_000,
      icon_asset_id: '0',
      id: '42',
      member_role_ids: [],
      name: 'Cordis Studio',
      owner_id: '7',
      permission_overwrites: [],
      revision: 1,
      roles: [],
      updated_at: 1_000,
    },
  ],
  read_states: [],
  session_id: 'gateway-session',
  session_node_id: 'node-1',
  user_id: '7',
}

describe('GatewayProvider', () => {
  it('connects for an authenticated session and stores the READY snapshot', () => {
    const queryClient = new QueryClient()
    const connection = new FakeGatewayConnection()
    const view = render(
      <QueryClientProvider client={queryClient}>
        <GatewayProvider enabled clientFactory={() => connection}>
          <GatewayStatusProbe />
        </GatewayProvider>
      </QueryClientProvider>,
    )

    expect(connection.connect).toHaveBeenCalledOnce()
    expect(screen.getByText('connecting:none')).toBeInTheDocument()

    act(() => connection.setState('ready'))
    expect(screen.getByText('ready:none')).toBeInTheDocument()

    act(() =>
      connection.dispatch({
        data: readyData,
        sequence: 1,
        type: 'READY',
      }),
    )
    expect(queryClient.getQueryData(gatewayReadyQueryKey)).toEqual(readyData)
    expect(queryClient.getQueryData<GuildSummary[]>(guildsQueryKey)?.[0]?.name).toBe(
      'Cordis Studio',
    )
    expect(
      queryClient.getQueryData<GuildChannelSummary[]>(guildChannelsQueryKey('42'))?.[0]?.name,
    ).toBe('general')

    act(() =>
      connection.dispatch({
        data: {
          created_at: 2_000,
          icon_asset_id: '0',
          id: '52',
          name: 'Design Team',
          owner_id: '7',
          revision: 1,
          updated_at: 2_000,
        },
        sequence: 2,
        type: 'guild.created',
      }),
    )
    expect(
      queryClient.getQueryData<GuildSummary[]>(guildsQueryKey)?.map((guild) => guild.name),
    ).toEqual(['Cordis Studio', 'Design Team'])

    act(() =>
      connection.dispatch({
        data: {
          created_at: 2_000,
          guild_id: '52',
          id: '53',
          name: 'general',
          parent_id: '0',
          position: 0,
          revision: 1,
          topic: '',
          type: 1,
          updated_at: 2_000,
        },
        sequence: 3,
        type: 'guild.channel.created',
      }),
    )
    expect(
      queryClient.getQueryData<GuildChannelSummary[]>(guildChannelsQueryKey('52'))?.[0]?.name,
    ).toBe('general')

    act(() =>
      connection.dispatch({
        data: {
          created_at: 2_000,
          guild_id: '52',
          id: '53',
          name: 'general',
          parent_id: '54',
          position: 2,
          revision: 2,
          topic: '',
          type: 1,
          updated_at: 2_500,
        },
        sequence: 4,
        type: 'guild.channel.updated',
      }),
    )
    expect(
      queryClient
        .getQueryData<GuildChannelSummary[]>(guildChannelsQueryKey('52'))
        ?.find((channel) => channel.id === '53'),
    ).toMatchObject({ parentId: '54', position: 2, revision: 2 })

    act(() =>
      connection.dispatch({
        data: { id: '52', revision: 2, deleted_at: 3_000 },
        sequence: 5,
        type: 'guild.deleted',
      }),
    )
    expect(
      queryClient.getQueryData<GuildSummary[]>(guildsQueryKey)?.map((guild) => guild.id),
    ).toEqual(['42'])
    expect(queryClient.getQueryData(guildChannelsQueryKey('52'))).toBeUndefined()

    view.unmount()
    expect(connection.disconnect).toHaveBeenCalledOnce()
    expect(queryClient.getQueryData(gatewayReadyQueryKey)).toBeUndefined()
    expect(queryClient.getQueryData(guildsQueryKey)).toBeUndefined()
  })

  it('publishes connection errors and clears them after reconnecting', () => {
    const queryClient = new QueryClient()
    const connection = new FakeGatewayConnection()
    render(
      <QueryClientProvider client={queryClient}>
        <GatewayProvider enabled clientFactory={() => connection}>
          <GatewayStatusProbe />
        </GatewayProvider>
      </QueryClientProvider>,
    )

    act(() => connection.fail('websocket_error'))
    expect(screen.getByText('connecting:websocket_error')).toBeInTheDocument()

    act(() => connection.setState('ready'))
    expect(screen.getByText('ready:none')).toBeInTheDocument()
  })

  it('reports an invalid Gateway configuration without crashing the application', () => {
    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <GatewayProvider
          enabled
          clientFactory={() => {
            throw new Error('invalid gateway URL')
          }}
        >
          <GatewayStatusProbe />
        </GatewayProvider>
      </QueryClientProvider>,
    )

    expect(screen.getByText('idle:configuration_error')).toBeInTheDocument()
  })
})
