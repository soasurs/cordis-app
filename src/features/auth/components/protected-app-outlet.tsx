import { useQuery } from '@tanstack/react-query'
import { Navigate, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'

import { AppShell } from '@/components/layout/app-shell'
import { useGatewayStatus } from '@/app/gateway-context'
import { CreateDmDialog } from '@/features/dm/components/create-dm-dialog'
import { CreateGuildDialog } from '@/features/guilds/components/create-guild-dialog'
import { JoinGuildInviteDialog } from '@/features/guilds/components/join-guild-invite-dialog'
import { guildsQueryOptions } from '@/features/guilds/guild-queries'
import { useCreateGuildDialog } from '@/stores/create-guild-dialog'
import { useCreateDmDialog } from '@/stores/create-dm-dialog'

import { authSessionQueryOptions } from '@/features/auth/auth-session'

export function ProtectedAppOutlet() {
  const { data: session } = useQuery(authSessionQueryOptions)
  const { data: guilds } = useQuery(guildsQueryOptions)
  const gatewayStatus = useGatewayStatus()
  const openCreateGuildDialog = useCreateGuildDialog((state) => state.open)
  const openCreateDmDialog = useCreateDmDialog((state) => state.open)
  const closeCreateDmDialog = useCreateDmDialog((state) => state.close)
  const createDmDialogOpen = useCreateDmDialog((state) => state.openState)
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const activeGuildId = pathname.match(/^\/guilds\/([^/]+)/)?.[1]
  const activeDmChannelId = pathname.match(/^\/dm\/([^/]+)/)?.[1]
  const activePersonalSection = pathname.startsWith('/friends')
    ? 'friends'
    : pathname.startsWith('/dm')
      ? 'dm'
      : 'home'
  const userSettingsOpen = pathname.startsWith('/settings/')

  if (!session) {
    return <Navigate to="/login" />
  }

  return (
    <>
      <AppShell
        activeDmChannelId={activeDmChannelId}
        activeGuildId={activeGuildId}
        activePersonalSection={activePersonalSection}
        gatewayStatus={gatewayStatus}
        guilds={guilds}
        onCreateCommunity={openCreateGuildDialog}
        onOpenNewDm={openCreateDmDialog}
        onOpenUserSettings={() => {
          void navigate({ replace: userSettingsOpen, to: '/settings/profile' })
        }}
        onSelectDm={(channelId) => {
          if (channelId) {
            void navigate({ params: { channelId }, to: '/dm/$channelId' })
          } else {
            void navigate({ to: '/dm' })
          }
        }}
        onSelectFriends={() => {
          void navigate({ search: {}, to: '/friends' })
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
      <CreateDmDialog open={createDmDialogOpen} onClose={closeCreateDmDialog} />
      <CreateGuildDialog />
      <JoinGuildInviteDialog />
    </>
  )
}
