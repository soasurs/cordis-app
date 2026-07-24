import { createFileRoute, redirect } from '@tanstack/react-router'

import { guildChannelsQueryOptions } from '@/features/guilds/guild-queries'
import { EmptyGuildRoutePage } from '@/features/guilds/pages/guild-route-pages'

export const Route = createFileRoute('/_app/guilds/$guildId/')({
  loader: async ({ context, params }) => {
    const channels = await context.queryClient.ensureQueryData(
      guildChannelsQueryOptions(params.guildId),
    )
    const orderedChannels = [...channels].sort(
      (left, right) => left.position - right.position || left.id.localeCompare(right.id),
    )
    const firstChannel =
      orderedChannels.find((channel) => channel.type === 1) ??
      orderedChannels.find((channel) => channel.type === 3)

    if (firstChannel) {
      throw redirect({
        params: { channelId: firstChannel.id, guildId: params.guildId },
        replace: true,
        to: '/guilds/$guildId/channels/$channelId',
      })
    }
  },
  component: EmptyGuildRoutePage,
})
