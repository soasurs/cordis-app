import { useQuery } from '@tanstack/react-query'

import { GuildSettingsMessage } from '@/features/guilds/components/guild-settings-layout'
import { ChannelOverviewSettings } from '@/features/guilds/components/channel-overview-settings'
import { ChannelOverwritesSettings } from '@/features/guilds/components/channel-overwrites-settings'
import { ChannelSettingsLayout } from '@/features/guilds/components/channel-settings-layout'
import type { ChannelSettingsTab } from '@/features/guilds/channel-settings-types'
import { canGuildCapability } from '@/features/guilds/guild-capabilities'
import { guildChannelsQueryOptions } from '@/features/guilds/guild-queries'
import { useGuildPermissions } from '@/features/guilds/use-guild-permissions'

interface ChannelSettingsPageProps {
  channelId: string
  guildId: string
  onClose: () => void
  onSelectTab?: (tab: ChannelSettingsTab) => void
  tab?: ChannelSettingsTab
}

export function ChannelSettingsPage({
  channelId,
  guildId,
  onClose,
  onSelectTab,
  tab = 'overview',
}: ChannelSettingsPageProps) {
  const channelsQuery = useQuery(guildChannelsQueryOptions(guildId))
  const permissions = useGuildPermissions(guildId)
  const channel = channelsQuery.data?.find((item) => item.id === channelId)
  const canManageChannels =
    permissions.status === 'ready' && canGuildCapability(permissions, 'manageChannels')

  if (!channel) {
    return (
      <ChannelSettingsLayout channelName="Channel" tab={tab} onClose={onClose}>
        <GuildSettingsMessage
          description="This channel is no longer available or has not finished loading."
          title="Channel unavailable"
        />
      </ChannelSettingsLayout>
    )
  }

  if (permissions.status !== 'ready') {
    return (
      <ChannelSettingsLayout channelName={channel.name} tab={tab} onClose={onClose}>
        <GuildSettingsMessage
          description="Checking whether you can change these settings."
          title="Loading permissions"
        />
      </ChannelSettingsLayout>
    )
  }

  if (!canManageChannels) {
    return (
      <ChannelSettingsLayout channelName={channel.name} tab={tab} onClose={onClose}>
        <GuildSettingsMessage
          description="You need Manage Channels permission before opening channel settings."
          title="You don’t have permission"
        />
      </ChannelSettingsLayout>
    )
  }

  return (
    <ChannelSettingsLayout
      channelName={channel.name}
      tab={tab}
      onClose={onClose}
      onSelectTab={onSelectTab}
    >
      {tab === 'overview' ? <ChannelOverviewSettings channel={channel} /> : null}
      {tab === 'overwrites' ? (
        <ChannelOverwritesSettings channelId={channelId} guildId={guildId} />
      ) : null}
    </ChannelSettingsLayout>
  )
}
