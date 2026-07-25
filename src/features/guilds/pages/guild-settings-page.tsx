import { useQuery } from '@tanstack/react-query'

import { authSessionQueryOptions } from '@/features/auth/auth-session'

import { GuildMembersSettings } from '@/features/guilds/components/guild-members-settings'
import { GuildOverviewSettings } from '@/features/guilds/components/guild-overview-settings'
import { GuildRolesSettings } from '@/features/guilds/components/guild-roles-settings'
import {
  GuildSettingsLayout,
  GuildSettingsMessage,
} from '@/features/guilds/components/guild-settings-layout'
import { guildsQueryOptions } from '@/features/guilds/guild-queries'
import type { GuildSettingsSection } from '@/features/guilds/guild-settings-types'

interface GuildSettingsPageProps {
  guildId: string
  onClose: () => void
  onSelectSection?: (section: GuildSettingsSection) => void
  section?: GuildSettingsSection
}

export function GuildSettingsPage({
  guildId,
  onClose,
  onSelectSection,
  section = 'overview',
}: GuildSettingsPageProps) {
  const { data: session } = useQuery(authSessionQueryOptions)
  const { data: guilds } = useQuery(guildsQueryOptions)
  const guild = guilds?.find((item) => item.id === guildId)

  if (!guild) {
    return (
      <GuildSettingsLayout guildName="Community" section={section} onClose={onClose}>
        <GuildSettingsMessage
          description="This community is no longer available or has not finished loading."
          title="Community unavailable"
        />
      </GuildSettingsLayout>
    )
  }

  if (guild.ownerId !== session?.user.userId.toString()) {
    return (
      <GuildSettingsLayout guildName={guild.name} section={section} onClose={onClose}>
        <GuildSettingsMessage
          description="Only the community owner can change these settings right now."
          title="You don’t have permission"
        />
      </GuildSettingsLayout>
    )
  }

  return (
    <GuildSettingsLayout
      guildName={guild.name}
      section={section}
      onClose={onClose}
      onSelectSection={onSelectSection}
    >
      {section === 'overview' ? <GuildOverviewSettings guild={guild} /> : null}
      {section === 'roles' ? <GuildRolesSettings guildId={guild.id} /> : null}
      {section === 'members' ? <GuildMembersSettings guild={guild} /> : null}
    </GuildSettingsLayout>
  )
}
