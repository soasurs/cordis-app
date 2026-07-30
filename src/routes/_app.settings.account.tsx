import { createFileRoute } from '@tanstack/react-router'

import { UserSettingsRoutePage } from '@/features/users/pages/user-settings-route-page'

export const Route = createFileRoute('/_app/settings/account')({
  component: () => <UserSettingsRoutePage section="account" />,
})
