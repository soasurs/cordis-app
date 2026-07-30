import { useNavigate } from '@tanstack/react-router'

import { friendsTabPaths, type FriendsTab } from '@/features/friends/friends-types'
import { FriendsPage } from '@/features/friends/pages/friends-page'

export function FriendsRoutePage({ tab }: { tab: FriendsTab }) {
  const navigate = useNavigate()

  return (
    <FriendsPage
      tab={tab}
      onSelectTab={(nextTab) => {
        void navigate({
          to: friendsTabPaths[nextTab],
        })
      }}
    />
  )
}
