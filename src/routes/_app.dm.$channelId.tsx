import { createFileRoute } from '@tanstack/react-router'

import { DmChannelRoutePage } from '@/features/dm/pages/dm-route-pages'

export const Route = createFileRoute('/_app/dm/$channelId')({
  component: DmChannelRoutePage,
})
