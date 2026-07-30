import { createFileRoute } from '@tanstack/react-router'

import { FriendsRoutePage } from '@/features/friends/pages/friends-route-page'

export const Route = createFileRoute('/_app/friends/blocked')({
  component: () => <FriendsRoutePage tab="blocked" />,
})
