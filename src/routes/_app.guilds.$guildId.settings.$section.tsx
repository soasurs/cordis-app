import { createFileRoute, redirect } from '@tanstack/react-router'

import { isGuildSettingsSection } from '@/features/guilds/guild-settings-types'
import { GuildSettingsRoutePage } from '@/features/guilds/pages/guild-settings-route-page'

export const Route = createFileRoute('/_app/guilds/$guildId/settings/$section')({
  beforeLoad: ({ params }) => {
    if (!isGuildSettingsSection(params.section)) {
      throw redirect({
        params: { guildId: params.guildId, section: 'overview' },
        replace: true,
        to: '/guilds/$guildId/settings/$section',
      })
    }
  },
  component: GuildSettingsRoutePage,
})
