import { createFileRoute, redirect } from '@tanstack/react-router'

import { isChannelSettingsTab } from '@/features/guilds/channel-settings-types'
import { ChannelSettingsRoutePage } from '@/features/guilds/pages/channel-settings-route-page'

export const Route = createFileRoute('/_app/guilds/$guildId/channels/$channelId/settings/$tab')({
  beforeLoad: ({ params }) => {
    if (!isChannelSettingsTab(params.tab)) {
      throw redirect({
        params: {
          channelId: params.channelId,
          guildId: params.guildId,
          tab: 'overview',
        },
        replace: true,
        to: '/guilds/$guildId/channels/$channelId/settings/$tab',
      })
    }
  },
  component: ChannelSettingsRoutePage,
})
