import { useQuery } from '@tanstack/react-query'

import { authSessionQueryOptions } from '@/features/auth/auth-session'
import { UserAccountSettings } from '@/features/users/components/user-account-settings'
import { UserProfileSettings } from '@/features/users/components/user-profile-settings'
import { UserSecuritySettings } from '@/features/users/components/user-security-settings'
import { UserSettingsLayout } from '@/features/users/components/user-settings-layout'
import type { UserSettingsSection } from '@/features/users/user-settings-types'

export function UserSettingsPage({
  onClose,
  onSelectSection,
  section,
}: {
  onClose: () => void
  onSelectSection: (section: UserSettingsSection) => void
  section: UserSettingsSection
}) {
  const { data: session } = useQuery(authSessionQueryOptions)

  if (!session) return null

  return (
    <UserSettingsLayout
      displayName={session.profile.name || session.profile.username}
      section={section}
      onClose={onClose}
      onSelectSection={onSelectSection}
    >
      {section === 'profile' ? <UserProfileSettings session={session} /> : null}
      {section === 'account' ? <UserAccountSettings session={session} /> : null}
      {section === 'security' ? <UserSecuritySettings /> : null}
    </UserSettingsLayout>
  )
}
