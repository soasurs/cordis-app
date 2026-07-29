import { createContext, useContext } from 'react'

import type { GatewayConnectionState, GatewayPresenceStatus } from '@/gateway'

export const gatewayReadyQueryKey = ['gateway', 'ready'] as const

export interface GatewayStatus {
  errorCode: string | null
  state: GatewayConnectionState
}

export const idleGatewayStatus: GatewayStatus = { errorCode: null, state: 'idle' }
export const GatewayStatusContext = createContext<GatewayStatus>(idleGatewayStatus)

export interface GatewayPresencePreference {
  setStatus: (status: GatewayPresenceStatus) => void
  status: GatewayPresenceStatus
}

const defaultGatewayPresencePreference: GatewayPresencePreference = {
  setStatus: () => undefined,
  status: 'online',
}

export const GatewayPresencePreferenceContext = createContext<GatewayPresencePreference>(
  defaultGatewayPresencePreference,
)

export function useGatewayStatus() {
  return useContext(GatewayStatusContext)
}

export function useGatewayPresencePreference() {
  return useContext(GatewayPresencePreferenceContext)
}
