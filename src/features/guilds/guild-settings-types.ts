export type GuildSettingsSection = 'members' | 'overview' | 'roles'

export const guildSettingsSections: { id: GuildSettingsSection; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'roles', label: 'Roles' },
  { id: 'members', label: 'Members' },
]

export function isGuildSettingsSection(value: string): value is GuildSettingsSection {
  return guildSettingsSections.some((section) => section.id === value)
}
