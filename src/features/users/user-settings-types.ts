export type UserSettingsSection = 'account' | 'profile' | 'security'

export const userSettingsSections: Array<{ id: UserSettingsSection; label: string }> = [
  { id: 'profile', label: 'Profile' },
  { id: 'account', label: 'Account' },
  { id: 'security', label: 'Security' },
]
