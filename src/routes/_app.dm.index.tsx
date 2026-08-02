import { createFileRoute } from '@tanstack/react-router'

import { DmListRoutePage } from '@/features/dm/pages/dm-route-pages'

export const Route = createFileRoute('/_app/dm/')({
  component: DmListRoutePage,
})
