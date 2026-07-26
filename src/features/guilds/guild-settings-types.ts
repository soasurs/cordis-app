export type GuildSettingsSection = 'invites' | 'members' | 'overview' | 'roles'

export const guildSettingsSections: { id: GuildSettingsSection; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'roles', label: 'Roles' },
  { id: 'members', label: 'Members' },
  { id: 'invites', label: 'Invites' },
]

export function isGuildSettingsSection(value: string): value is GuildSettingsSection {
  return guildSettingsSections.some((section) => section.id === value)
}
