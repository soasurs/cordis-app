import { useNavigate, useParams } from '@tanstack/react-router'

import { GuildPage } from './guild-page'

export function EmptyGuildRoutePage() {
  const { guildId } = useParams({ from: '/_app/guilds/$guildId/' })
  const navigate = useNavigate()

  return (
    <GuildPage
      guildId={guildId}
      onSelectChannel={(channelId) => {
        void navigate({
          params: { channelId, guildId },
          to: '/guilds/$guildId/channels/$channelId',
        })
      }}
    />
  )
}

export function GuildChannelRoutePage() {
  const { channelId, guildId } = useParams({
    from: '/_app/guilds/$guildId/channels/$channelId',
  })
  const navigate = useNavigate()

  return (
    <GuildPage
      channelId={channelId}
      guildId={guildId}
      onSelectChannel={(nextChannelId) => {
        void navigate({
          params: { channelId: nextChannelId, guildId },
          to: '/guilds/$guildId/channels/$channelId',
        })
      }}
    />
  )
}
