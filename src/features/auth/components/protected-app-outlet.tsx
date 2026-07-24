import { useQuery } from '@tanstack/react-query'
import { Navigate, Outlet } from '@tanstack/react-router'

import { authSessionQueryOptions } from '../auth-session'

export function ProtectedAppOutlet() {
  const { data: session } = useQuery(authSessionQueryOptions)

  if (!session) {
    return <Navigate to="/login" />
  }

  return <Outlet />
}
