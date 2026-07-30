export const friendsTabs = [
  { id: 'all', label: 'All friends' },
  { id: 'pending', label: 'Pending' },
  { id: 'blocked', label: 'Blocked' },
] as const

export type FriendsTab = (typeof friendsTabs)[number]['id']

export function isFriendsTab(value: unknown): value is FriendsTab {
  return friendsTabs.some((tab) => tab.id === value)
}
