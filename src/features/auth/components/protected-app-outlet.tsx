import { useQuery } from '@tanstack/react-query'
import { Navigate, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'

import { AppShell } from '@/components/layout/app-shell'
import { useGatewayStatus } from '@/app/gateway-context'
import { CreateGuildDialog } from '@/features/guilds/components/create-guild-dialog'
import { JoinGuildInviteDialog } from '@/features/guilds/components/join-guild-invite-dialog'
import { guildsQueryOptions } from '@/features/guilds/guild-queries'
import { useCreateGuildDialog } from '@/stores/create-guild-dialog'

import { authSessionQueryOptions } from '@/features/auth/auth-session'

export function ProtectedAppOutlet() {
  const { data: session } = useQuery(authSessionQueryOptions)
  const { data: guilds } = useQuery(guildsQueryOptions)
  const gatewayStatus = useGatewayStatus()
  const openCreateGuildDialog = useCreateGuildDialog((state) => state.open)
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const activeGuildId = pathname.match(/^\/guilds\/([^/]+)/)?.[1]
  const userSettingsOpen = pathname.startsWith('/settings/')

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
        onOpenUserSettings={() => {
          void navigate({ replace: userSettingsOpen, to: '/settings/profile' })
        }}
        onSelectGuild={(guildId) => {
          void navigate({ params: { guildId }, to: '/guilds/$guildId' })
        }}
        onSelectHome={() => {
          void navigate({ to: '/' })
        }}
        user={{
          avatarAssetId: session.profile.avatarAssetId?.toString(),
          name: session.profile.name,
          userId: session.profile.userId?.toString(),
          username: session.profile.username,
        }}
        userSettingsOpen={userSettingsOpen}
      >
        <Outlet />
      </AppShell>
      <CreateGuildDialog />
      <JoinGuildInviteDialog />
    </>
  )
}
