import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

import { authSessionQueryOptions } from '@/features/auth/auth-session'
import { useGatewayStatus } from '@/app/gateway-context'

import { HomePage } from '@/features/home/pages/home-page'

export function CurrentUserHomePage() {
  const { data: session } = useQuery(authSessionQueryOptions)
  const gatewayStatus = useGatewayStatus()
  const navigate = useNavigate()

  return (
    <HomePage
      displayName={session?.profile.name || session?.profile.username || 'there'}
      gatewayStatus={gatewayStatus}
      onSelectDm={(channelId) => {
        void navigate({ params: { channelId }, to: '/dm/$channelId' })
      }}
      onSelectGuild={(guildId) => {
        void navigate({ params: { guildId }, to: '/guilds/$guildId' })
      }}
      onViewAllDm={() => {
        void navigate({ to: '/dm' })
      }}
      onViewPendingRequests={() => {
        void navigate({ to: '/friends/pending' })
      }}
    />
  )
}
