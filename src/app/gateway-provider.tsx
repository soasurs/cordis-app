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
  updatePresence(presence: { client_state: string }): void
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

    let connectionState: GatewayConnectionState = client.state
    let clientState = getDocumentClientState()
    let sentClientState = clientState
    let clientStateTimer: ReturnType<typeof setTimeout> | null = null

    const sendClientState = () => {
      if (clientStateTimer) {
        clearTimeout(clientStateTimer)
      }
      clientStateTimer = null
      if (connectionState === 'ready' && clientState !== sentClientState) {
        client.updatePresence({ client_state: clientState })
        sentClientState = clientState
      }
    }
    const scheduleClientState = () => {
      clientState = getDocumentClientState()
      if (clientState === sentClientState) {
        if (clientStateTimer) {
          clearTimeout(clientStateTimer)
          clientStateTimer = null
        }
        return
      }
      if (clientStateTimer) {
        return
      }
      clientStateTimer = setTimeout(sendClientState, 150)
    }
    const unsubscribeState = client.onStateChange(({ current }) => {
      connectionState = current
      setStatus((currentStatus) => ({
        errorCode: current === 'ready' ? null : currentStatus.errorCode,
        state: current,
      }))
      if (current === 'ready') {
        sendClientState()
      }
    })
    const unsubscribeError = client.onError((error) => {
      setStatus((currentStatus) => ({ ...currentStatus, errorCode: error.code }))
    })
    const unsubscribeDispatch = client.onDispatch((dispatch) => {
      syncGatewayDispatch(queryClient, dispatch)
    })

    client.connect()
    document.addEventListener('visibilitychange', scheduleClientState)

    return () => {
      document.removeEventListener('visibilitychange', scheduleClientState)
      if (clientStateTimer) {
        clearTimeout(clientStateTimer)
      }
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
      clientState: getDocumentClientState(),
      deviceType: 'web',
      status: 'online',
    },
  })
}

function getDocumentClientState() {
  return document.visibilityState === 'visible' ? 'foreground' : 'background'
}
