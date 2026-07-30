import { useNavigate, useSearch } from '@tanstack/react-router'

import { FriendsPage } from '@/features/friends/pages/friends-page'

export function FriendsRoutePage() {
  const { tab } = useSearch({ from: '/_app/friends' })
  const navigate = useNavigate()

  return (
    <FriendsPage
      tab={tab ?? 'all'}
      onSelectTab={(nextTab) => {
        void navigate({
          search: nextTab === 'all' ? {} : { tab: nextTab },
          to: '/friends',
        })
      }}
    />
  )
}
