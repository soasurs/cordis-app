import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState, type PropsWithChildren } from 'react'

import { createGatewayTicket } from '@/api/authenticator'
import {
  GatewayClient,
  type GatewayClientError,
  type GatewayConnectionState,
  type GatewayDispatch,
  type GatewayStateChange,
} from '@/gateway'

import { GatewayStatusContext, idleGatewayStatus, type GatewayStatus } from '@/app/gateway-context'
import { clearGatewayQueries, syncGatewayDispatch } from '@/app/gateway-query-sync'

interface GatewayConnection {
  readonly state: GatewayConnectionState
  connect(): void
  disconnect(): void
  onDispatch(listener: (dispatch: GatewayDispatch) => void): () => void
  onError(listener: (error: GatewayClientError) => void): () => void
  onStateChange(listener: (change: GatewayStateChange) => void): () => void
}

interface GatewayProviderProps extends PropsWithChildren {
  clientFactory?: () => GatewayConnection
  enabled: boolean
}

export function GatewayProvider({
  children,
  clientFactory = createGatewayConnection,
  enabled,
}: GatewayProviderProps) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<GatewayStatus>(idleGatewayStatus)
  const connectionResult = useMemo(() => {
    if (!enabled) {
      return { client: null, errorCode: null }
    }

    try {
      return { client: clientFactory(), errorCode: null }
    } catch {
      return { client: null, errorCode: 'configuration_error' }
    }
  }, [clientFactory, enabled])

  useEffect(() => {
    const client = connectionResult.client
    if (!client) {
      return
    }

    const unsubscribeState = client.onStateChange(({ current }) => {
      setStatus((currentStatus) => ({
        errorCode: current === 'ready' ? null : currentStatus.errorCode,
        state: current,
      }))
    })
    const unsubscribeError = client.onError((error) => {
      setStatus((currentStatus) => ({ ...currentStatus, errorCode: error.code }))
    })
    const unsubscribeDispatch = client.onDispatch((dispatch) => {
      syncGatewayDispatch(queryClient, dispatch)
    })

    client.connect()

    return () => {
      unsubscribeDispatch()
      unsubscribeError()
      unsubscribeState()
      client.disconnect()
      clearGatewayQueries(queryClient)
    }
  }, [connectionResult.client, queryClient])

  const value = enabled
    ? connectionResult.errorCode
      ? { errorCode: connectionResult.errorCode, state: 'idle' as const }
      : status
    : idleGatewayStatus

  return <GatewayStatusContext value={value}>{children}</GatewayStatusContext>
}

function createGatewayConnection() {
  return new GatewayClient({
    getGatewayTicket: createGatewayTicket,
    identify: {
      clientState: document.visibilityState === 'visible' ? 'foreground' : 'background',
      deviceType: 'web',
      status: 'online',
    },
  })
}
