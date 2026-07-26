export const channelSettingsTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'overwrites', label: 'Overwrites' },
] as const

export type ChannelSettingsTab = (typeof channelSettingsTabs)[number]['id']

export function isChannelSettingsTab(value: string): value is ChannelSettingsTab {
  return channelSettingsTabs.some((tab) => tab.id === value)
}
