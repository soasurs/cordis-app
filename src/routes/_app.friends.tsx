import { createFileRoute } from '@tanstack/react-router'

import { isFriendsTab, type FriendsTab } from '@/features/friends/friends-types'
import { FriendsRoutePage } from '@/features/friends/pages/friends-route-page'

interface FriendsSearch {
  tab?: Exclude<FriendsTab, 'all'>
}

export const Route = createFileRoute('/_app/friends')({
  component: FriendsRoutePage,
  validateSearch: (search: Record<string, unknown>): FriendsSearch => ({
    tab: isFriendsTab(search.tab) && search.tab !== 'all' ? search.tab : undefined,
  }),
})
