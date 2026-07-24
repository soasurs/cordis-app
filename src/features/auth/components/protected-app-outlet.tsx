import { useQuery } from '@tanstack/react-query'
import { Navigate, Outlet } from '@tanstack/react-router'

import { AppShell } from '@/components/layout/app-shell'
import { useGatewayStatus } from '@/app/gateway-context'

import { authSessionQueryOptions } from '../auth-session'

export function ProtectedAppOutlet() {
  const { data: session } = useQuery(authSessionQueryOptions)
  const gatewayStatus = useGatewayStatus()

  if (!session) {
    return <Navigate to="/login" />
  }

  return (
    <AppShell
      gatewayStatus={gatewayStatus}
      user={{ name: session.profile.name, username: session.profile.username }}
    >
      <Outlet />
    </AppShell>
  )
}
