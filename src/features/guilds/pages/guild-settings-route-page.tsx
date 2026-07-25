import { useNavigate, useParams } from '@tanstack/react-router'

import {
  isGuildSettingsSection,
  type GuildSettingsSection,
} from '@/features/guilds/guild-settings-types'

import { GuildSettingsPage } from '@/features/guilds/pages/guild-settings-page'

export function GuildSettingsRoutePage() {
  const { guildId, section: sectionParam } = useParams({
    from: '/_app/guilds/$guildId/settings/$section',
  })
  const navigate = useNavigate()
  const section = isGuildSettingsSection(sectionParam) ? sectionParam : 'overview'

  return (
    <GuildSettingsPage
      guildId={guildId}
      section={section}
      onSelectSection={(nextSection: GuildSettingsSection) => {
        void navigate({
          params: { guildId, section: nextSection },
          replace: true,
          to: '/guilds/$guildId/settings/$section',
        })
      }}
      onClose={() => {
        void navigate({ params: { guildId }, replace: true, to: '/guilds/$guildId' })
      }}
    />
  )
}
