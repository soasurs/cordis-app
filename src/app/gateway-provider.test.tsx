import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  GatewayClientError,
  type GatewayConnectionState,
  type GatewayDispatch,
  type GatewayStateChange,
} from '@/gateway'

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
        data: { session_id: 'gateway-session' },
        sequence: 1,
        type: 'READY',
      }),
    )
    expect(queryClient.getQueryData(gatewayReadyQueryKey)).toEqual({
      session_id: 'gateway-session',
    })

    view.unmount()
    expect(connection.disconnect).toHaveBeenCalledOnce()
    expect(queryClient.getQueryData(gatewayReadyQueryKey)).toBeUndefined()
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
