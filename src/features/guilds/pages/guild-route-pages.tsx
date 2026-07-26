import { useNavigate, useParams } from '@tanstack/react-router'

import { GuildPage } from '@/features/guilds/pages/guild-page'

export function EmptyGuildRoutePage() {
  const { guildId } = useParams({ from: '/_app/guilds/$guildId/' })
  const navigate = useNavigate()

  return (
    <GuildPage
      guildId={guildId}
      onOpenChannelSettings={(channel) => {
        void navigate({
          params: { channelId: channel.id, guildId, tab: 'overview' },
          to: '/guilds/$guildId/channels/$channelId/settings/$tab',
        })
      }}
      onOpenSettings={() => {
        void navigate({
          params: { guildId, section: 'overview' },
          to: '/guilds/$guildId/settings/$section',
        })
      }}
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
    from: '/_app/guilds/$guildId/channels/$channelId/',
  })
  const navigate = useNavigate()

  return (
    <GuildPage
      channelId={channelId}
      guildId={guildId}
      onOpenChannelSettings={(channel) => {
        void navigate({
          params: { channelId: channel.id, guildId, tab: 'overview' },
          to: '/guilds/$guildId/channels/$channelId/settings/$tab',
        })
      }}
      onOpenSettings={() => {
        void navigate({
          params: { guildId, section: 'overview' },
          to: '/guilds/$guildId/settings/$section',
        })
      }}
      onSelectChannel={(nextChannelId) => {
        void navigate({
          params: { channelId: nextChannelId, guildId },
          to: '/guilds/$guildId/channels/$channelId',
        })
      }}
    />
  )
}
