import { useNavigate, useParams } from '@tanstack/react-router'

import {
  isChannelSettingsTab,
  type ChannelSettingsTab,
} from '@/features/guilds/channel-settings-types'
import { ChannelSettingsPage } from '@/features/guilds/pages/channel-settings-page'

export function ChannelSettingsRoutePage() {
  const {
    channelId,
    guildId,
    tab: tabParam,
  } = useParams({
    from: '/_app/guilds/$guildId/channels/$channelId/settings/$tab',
  })
  const navigate = useNavigate()
  const tab = isChannelSettingsTab(tabParam) ? tabParam : 'overview'

  return (
    <ChannelSettingsPage
      channelId={channelId}
      guildId={guildId}
      tab={tab}
      onSelectTab={(nextTab: ChannelSettingsTab) => {
        void navigate({
          params: { channelId, guildId, tab: nextTab },
          replace: true,
          to: '/guilds/$guildId/channels/$channelId/settings/$tab',
        })
      }}
      onClose={() => {
        void navigate({
          params: { channelId, guildId },
          replace: true,
          to: '/guilds/$guildId/channels/$channelId',
        })
      }}
    />
  )
}
