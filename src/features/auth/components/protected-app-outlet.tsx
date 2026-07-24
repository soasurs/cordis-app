import { useQuery } from '@tanstack/react-query'
import { Navigate, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'

import { AppShell } from '@/components/layout/app-shell'
import { useGatewayStatus } from '@/app/gateway-context'
import { CreateGuildDialog } from '@/features/guilds/components/create-guild-dialog'
import { guildsQueryOptions } from '@/features/guilds/guild-queries'
import { useCreateGuildDialog } from '@/stores/create-guild-dialog'

import { authSessionQueryOptions } from '../auth-session'

export function ProtectedAppOutlet() {
  const { data: session } = useQuery(authSessionQueryOptions)
  const { data: guilds } = useQuery(guildsQueryOptions)
  const gatewayStatus = useGatewayStatus()
  const openCreateGuildDialog = useCreateGuildDialog((state) => state.open)
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const activeGuildId = pathname.match(/^\/guilds\/([^/]+)/)?.[1]

  if (!session) {
    return <Navigate to="/login" />
  }

  return (
    <>
      <AppShell
        activeGuildId={activeGuildId}
        gatewayStatus={gatewayStatus}
        guilds={guilds}
        onCreateCommunity={openCreateGuildDialog}
        onSelectGuild={(guildId) => {
          void navigate({ params: { guildId }, to: '/guilds/$guildId' })
        }}
        onSelectHome={() => {
          void navigate({ to: '/' })
        }}
        user={{ name: session.profile.name, username: session.profile.username }}
      >
        <Outlet />
      </AppShell>
      <CreateGuildDialog />
    </>
  )
}
