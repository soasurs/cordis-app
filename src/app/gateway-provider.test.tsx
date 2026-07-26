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
  guildMemberRolesQueryKey,
  guildMembersQueryKey,
  guildRolesQueryKey,
  guildsQueryKey,
  type GuildChannelSummary,
  type GuildRoleSummary,
  type GuildSummary,
} from '@/features/guilds/guild-queries'

import { gatewayReadyQueryKey, useGatewayStatus } from '@/app/gateway-context'
import { GatewayProvider } from '@/app/gateway-provider'

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
      description: 'A community for thoughtful tools.',
      icon_asset_id: '0',
      id: '42',
      member_role_ids: ['50'],
      name: 'Cordis Studio',
      owner_id: '7',
      permission_overwrites: [],
      revision: 1,
      roles: [
        {
          created_at: 1_000,
          guild_id: '42',
          id: '50',
          is_default: true,
          name: 'Everyone',
          permissions: '1',
          position: 0,
          revision: 1,
          updated_at: 1_000,
        },
      ],
      updated_at: 1_000,
    },
  ],
  read_states: [],
  session_id: 'gateway-session',
  session_node_id: 'node-1',
  user_id: '7',
}

describe('GatewayProvider', () => {
  it('connects for an authenticated session and stores the ready snapshot', () => {
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
        type: 'ready',
      }),
    )
    expect(queryClient.getQueryData(gatewayReadyQueryKey)).toEqual(readyData)
    expect(queryClient.getQueryData<GuildSummary[]>(guildsQueryKey)?.[0]).toMatchObject({
      description: 'A community for thoughtful tools.',
      name: 'Cordis Studio',
    })
    expect(
      queryClient.getQueryData<GuildChannelSummary[]>(guildChannelsQueryKey('42'))?.[0]?.name,
    ).toBe('general')
    expect(queryClient.getQueryData<GuildRoleSummary[]>(guildRolesQueryKey('42'))?.[0]?.name).toBe(
      'Everyone',
    )
    expect(queryClient.getQueryData<GuildRoleSummary[]>(guildMemberRolesQueryKey('42', '7'))).toEqual(
      [
        expect.objectContaining({
          id: '50',
          name: 'Everyone',
          permissions: '1',
        }),
      ],
    )

    act(() =>
      connection.dispatch({
        data: {
          created_at: 2_000,
          guild_id: '42',
          id: '51',
          is_default: false,
          name: 'Helpers',
          permissions: '2',
          position: 1,
          revision: 1,
          updated_at: 2_000,
        },
        sequence: 2,
        type: 'guild.role.created',
      }),
    )
    expect(
      queryClient
        .getQueryData<GuildRoleSummary[]>(guildRolesQueryKey('42'))
        ?.find((role) => role.id === '51'),
    ).toMatchObject({ name: 'Helpers', permissions: '2' })

    act(() =>
      connection.dispatch({
        data: {
          guild_id: '42',
          role_ids: ['50', '51'],
          updated_at: 2_100,
          user_id: '7',
        },
        sequence: 3,
        type: 'guild.member.roles.updated',
      }),
    )
    expect(
      queryClient.getQueryData<GuildRoleSummary[]>(guildMemberRolesQueryKey('42', '7'))?.map(
        (role) => role.id,
      ),
    ).toEqual(['50', '51'])

    act(() =>
      connection.dispatch({
        data: {
          created_at: 2_000,
          guild_id: '42',
          id: '51',
          is_default: false,
          name: 'Moderators',
          permissions: '6',
          position: 1,
          revision: 2,
          updated_at: 2_500,
        },
        sequence: 4,
        type: 'guild.role.updated',
      }),
    )
    expect(
      queryClient
        .getQueryData<GuildRoleSummary[]>(guildRolesQueryKey('42'))
        ?.find((role) => role.id === '51'),
    ).toMatchObject({ name: 'Moderators', permissions: '6', revision: 2 })
    expect(
      queryClient
        .getQueryData<GuildRoleSummary[]>(guildMemberRolesQueryKey('42', '7'))
        ?.find((role) => role.id === '51'),
    ).toMatchObject({ name: 'Moderators', permissions: '6', revision: 2 })
    expect(queryClient.getQueryState(guildChannelsQueryKey('42'))?.isInvalidated).toBe(true)

    act(() =>
      connection.dispatch({
        data: { deleted_at: 3_000, guild_id: '42', id: '51', revision: 3 },
        sequence: 5,
        type: 'guild.role.deleted',
      }),
    )
    expect(
      queryClient
        .getQueryData<GuildRoleSummary[]>(guildRolesQueryKey('42'))
        ?.some((role) => role.id === '51'),
    ).toBe(false)
    expect(
      queryClient
        .getQueryData<GuildRoleSummary[]>(guildMemberRolesQueryKey('42', '7'))
        ?.some((role) => role.id === '51'),
    ).toBe(false)

    queryClient.setQueryData(guildMembersQueryKey('42'), {
      pageParams: [undefined],
      pages: [{ members: [] }],
    })
    expect(queryClient.getQueryState(guildMembersQueryKey('42'))?.isInvalidated).toBe(false)
    act(() =>
      connection.dispatch({
        data: {
          guild_id: '42',
          joined_at: 1_000,
          nickname: 'Alex',
          revision: 2,
          updated_at: 3_000,
          user_id: '7',
        },
        sequence: 6,
        type: 'guild.member.updated',
      }),
    )
    expect(queryClient.getQueryState(guildMembersQueryKey('42'))?.isInvalidated).toBe(true)

    act(() =>
      connection.dispatch({
        data: {
          guild_id: '42',
          role_ids: ['50'],
          updated_at: 3_000,
          user_id: '7',
        },
        sequence: 7,
        type: 'guild.member.roles.updated',
      }),
    )
    expect(queryClient.getQueryData<GuildRoleSummary[]>(guildMemberRolesQueryKey('42', '7'))).toEqual(
      [expect.objectContaining({ id: '50', name: 'Everyone' })],
    )
    expect(queryClient.getQueryState(guildMemberRolesQueryKey('42', '7'))?.isInvalidated).toBe(
      false,
    )

    act(() =>
      connection.dispatch({
        data: {
          created_at: 2_000,
          description: 'Design-focused workspace',
          icon_asset_id: '0',
          id: '52',
          name: 'Design Team',
          owner_id: '7',
          revision: 1,
          updated_at: 2_000,
        },
        sequence: 8,
        type: 'guild.created',
      }),
    )
    expect(
      queryClient.getQueryData<GuildSummary[]>(guildsQueryKey)?.map((guild) => guild.name),
    ).toEqual(['Cordis Studio', 'Design Team'])
    expect(
      queryClient.getQueryData<GuildSummary[]>(guildsQueryKey)?.find((guild) => guild.id === '52')
        ?.description,
    ).toBe('Design-focused workspace')

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
        sequence: 7,
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
        sequence: 8,
        type: 'guild.channel.updated',
      }),
    )
    expect(
      queryClient
        .getQueryData<GuildChannelSummary[]>(guildChannelsQueryKey('52'))
        ?.find((channel) => channel.id === '53'),
    ).toMatchObject({ parentId: '54', position: 2, revision: 2 })

    queryClient.setQueryData(guildRolesQueryKey('52'), [])
    queryClient.setQueryData(guildMembersQueryKey('52'), { pageParams: [], pages: [] })

    act(() =>
      connection.dispatch({
        data: { id: '52', revision: 2, deleted_at: 3_000 },
        sequence: 9,
        type: 'guild.deleted',
      }),
    )
    expect(
      queryClient.getQueryData<GuildSummary[]>(guildsQueryKey)?.map((guild) => guild.id),
    ).toEqual(['42'])
    expect(queryClient.getQueryData(guildChannelsQueryKey('52'))).toBeUndefined()
    expect(queryClient.getQueryData(guildRolesQueryKey('52'))).toBeUndefined()
    expect(queryClient.getQueryData(guildMembersQueryKey('52'))).toBeUndefined()

    act(() =>
      connection.dispatch({
        data: { ...readyData, guilds: [] },
        sequence: 10,
        type: 'ready',
      }),
    )
    expect(queryClient.getQueryData(guildChannelsQueryKey('42'))).toBeUndefined()
    expect(queryClient.getQueryData(guildRolesQueryKey('42'))).toBeUndefined()
    expect(queryClient.getQueryData(guildMembersQueryKey('42'))).toBeUndefined()

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
