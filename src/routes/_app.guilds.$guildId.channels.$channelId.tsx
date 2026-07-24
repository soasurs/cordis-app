import { createFileRoute, notFound } from '@tanstack/react-router'

import { guildChannelsQueryOptions } from '@/features/guilds/guild-queries'
import { GuildChannelRoutePage } from '@/features/guilds/pages/guild-route-pages'

export const Route = createFileRoute('/_app/guilds/$guildId/channels/$channelId')({
  loader: async ({ context, params }) => {
    const channels = await context.queryClient.ensureQueryData(
      guildChannelsQueryOptions(params.guildId),
    )
    const channel = channels.find(
      (item) => item.id === params.channelId && (item.type === 1 || item.type === 3),
    )

    if (!channel) {
      throw notFound()
    }
  },
  component: GuildChannelRoutePage,
})
