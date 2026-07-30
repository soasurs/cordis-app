export const friendsTabs = [
  { id: 'all', label: 'All friends' },
  { id: 'pending', label: 'Pending' },
  { id: 'blocked', label: 'Blocked' },
] as const

export type FriendsTab = (typeof friendsTabs)[number]['id']

export const friendsTabPaths = {
  all: '/friends',
  blocked: '/friends/blocked',
  pending: '/friends/pending',
} as const satisfies Record<FriendsTab, string>
