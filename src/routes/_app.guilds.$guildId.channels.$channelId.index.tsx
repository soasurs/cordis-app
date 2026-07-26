import { createFileRoute, redirect } from '@tanstack/react-router'

import { GuildChannelType } from '@/api/guild'
import { guildChannelsQueryOptions } from '@/features/guilds/guild-queries'
import { GuildChannelRoutePage } from '@/features/guilds/pages/guild-route-pages'

export const Route = createFileRoute('/_app/guilds/$guildId/channels/$channelId/')({
  loader: async ({ context, params }) => {
    const channels = await context.queryClient.ensureQueryData(
      guildChannelsQueryOptions(params.guildId),
    )
    const channel = channels.find((item) => item.id === params.channelId)
    // Categories are settings-only; they are not selectable chat destinations.
    if (!channel || channel.type === GuildChannelType.CATEGORY) {
      throw redirect({
        params: { guildId: params.guildId },
        replace: true,
        to: '/guilds/$guildId',
      })
    }
  },
  component: GuildChannelRoutePage,
})
