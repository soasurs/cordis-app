import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

import { GuildMembersSettings } from '@/features/guilds/components/guild-members-settings'
import { GuildOverviewSettings } from '@/features/guilds/components/guild-overview-settings'
import { GuildRolesSettings } from '@/features/guilds/components/guild-roles-settings'
import {
  GuildSettingsLayout,
  GuildSettingsMessage,
} from '@/features/guilds/components/guild-settings-layout'
import {
  canAccessGuildSettingsSection,
} from '@/features/guilds/guild-capabilities'
import { guildsQueryOptions } from '@/features/guilds/guild-queries'
import {
  guildSettingsSections,
  type GuildSettingsSection,
} from '@/features/guilds/guild-settings-types'
import { useGuildCapabilities } from '@/features/guilds/use-guild-permissions'

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
  const { data: guilds } = useQuery(guildsQueryOptions)
  const { can, permissions } = useGuildCapabilities(guildId)
  const guild = guilds?.find((item) => item.id === guildId)
  const canOpenSettings = can('openGuildSettings')
  const allowedSections =
    permissions.status === 'ready'
      ? guildSettingsSections.filter((item) => canAccessGuildSettingsSection(permissions, item.id))
      : guildSettingsSections
  const canAccessSection =
    permissions.status === 'ready' && canAccessGuildSettingsSection(permissions, section)

  useEffect(() => {
    if (permissions.status !== 'ready' || !onSelectSection || canAccessSection) return
    const fallback = allowedSections[0]
    if (fallback) onSelectSection(fallback.id)
  }, [allowedSections, canAccessSection, onSelectSection, permissions.status])

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

  if (permissions.status !== 'ready') {
    return (
      <GuildSettingsLayout guildName={guild.name} section={section} onClose={onClose}>
        <GuildSettingsMessage
          description="Checking whether you can change these settings."
          title="Loading permissions"
        />
      </GuildSettingsLayout>
    )
  }

  if (!canOpenSettings) {
    return (
      <GuildSettingsLayout guildName={guild.name} section={section} onClose={onClose}>
        <GuildSettingsMessage
          description="You need permission to manage this community before opening settings."
          title="You don’t have permission"
        />
      </GuildSettingsLayout>
    )
  }

  return (
    <GuildSettingsLayout
      allowedSections={allowedSections.map((item) => item.id)}
      guildName={guild.name}
      section={section}
      onClose={onClose}
      onSelectSection={onSelectSection}
    >
      {canAccessSection && section === 'overview' ? <GuildOverviewSettings guild={guild} /> : null}
      {canAccessSection && section === 'roles' ? <GuildRolesSettings guildId={guild.id} /> : null}
      {canAccessSection && section === 'members' ? <GuildMembersSettings guild={guild} /> : null}
    </GuildSettingsLayout>
  )
}
