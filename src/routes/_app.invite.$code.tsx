import { createFileRoute } from '@tanstack/react-router'

import { InviteCodeRoutePage } from '@/features/guilds/pages/invite-code-route-page'

export const Route = createFileRoute('/_app/invite/$code')({
  component: InviteCodeRoutePage,
})
