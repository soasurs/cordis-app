import { useQuery } from '@tanstack/react-query'

import { authSessionQueryOptions } from '@/features/auth/auth-session'
import { useGatewayStatus } from '@/app/gateway-context'

import { HomePage } from './home-page'

export function CurrentUserHomePage() {
  const { data: session } = useQuery(authSessionQueryOptions)
  const gatewayStatus = useGatewayStatus()

  return (
    <HomePage
      displayName={session?.profile.name || session?.profile.username || 'there'}
      gatewayStatus={gatewayStatus}
    />
  )
}
