import { useNavigate, useRouter } from '@tanstack/react-router'

import { UserSettingsPage } from '@/features/users/pages/user-settings-page'
import type { UserSettingsSection } from '@/features/users/user-settings-types'

export function UserSettingsRoutePage({ section }: { section: UserSettingsSection }) {
  const navigate = useNavigate()
  const router = useRouter()

  return (
    <UserSettingsPage
      section={section}
      onSelectSection={(nextSection) => {
        switch (nextSection) {
          case 'profile':
            void navigate({ replace: true, to: '/settings/profile' })
            break
          case 'account':
            void navigate({ replace: true, to: '/settings/account' })
            break
          case 'security':
            void navigate({ replace: true, to: '/settings/security' })
            break
        }
      }}
      onClose={() => {
        if (router.history.canGoBack()) {
          router.history.back()
          return
        }
        void navigate({ replace: true, to: '/' })
      }}
    />
  )
}
