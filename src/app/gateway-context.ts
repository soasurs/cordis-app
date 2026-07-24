import { createContext, useContext } from 'react'

import type { GatewayConnectionState } from '@/gateway'

export const gatewayReadyQueryKey = ['gateway', 'ready'] as const

export interface GatewayStatus {
  errorCode: string | null
  state: GatewayConnectionState
}

export const idleGatewayStatus: GatewayStatus = { errorCode: null, state: 'idle' }
export const GatewayStatusContext = createContext<GatewayStatus>(idleGatewayStatus)

export function useGatewayStatus() {
  return useContext(GatewayStatusContext)
}
