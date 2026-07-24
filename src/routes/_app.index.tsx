import { createFileRoute } from '@tanstack/react-router'

import { CurrentUserHomePage } from '@/features/home/pages/current-user-home-page'

export const Route = createFileRoute('/_app/')({
  component: CurrentUserHomePage,
})
