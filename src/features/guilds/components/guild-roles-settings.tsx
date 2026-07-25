import { useQuery } from '@tanstack/react-query'

import { getApiErrorMessage } from '@/api/errors'

import { guildRolesQueryOptions } from '../guild-queries'
import { GuildRolesWorkspace } from './guild-roles-workspace'
import {
  SettingsListError,
  SettingsListSkeleton,
  SettingsPageHeading,
} from './guild-settings-list-states'

export function GuildRolesSettings({ guildId }: { guildId: string }) {
  const rolesQuery = useQuery(guildRolesQueryOptions(guildId))
  const roles = [...(rolesQuery.data ?? [])].sort(
    (left, right) => right.position - left.position || left.id.localeCompare(right.id),
  )

  return (
    <>
      <SettingsPageHeading
        count={rolesQuery.isSuccess ? roles.length : undefined}
        description="Select a role to review the permissions it grants across this community."
        eyebrow="Access control"
        title="Roles"
      />

      {rolesQuery.isPending ? <SettingsListSkeleton /> : null}
      {rolesQuery.isError ? (
        <SettingsListError
          message={getApiErrorMessage(
            rolesQuery.error,
            'Unable to load community roles. Please try again.',
          )}
          onRetry={() => void rolesQuery.refetch()}
        />
      ) : null}
      {rolesQuery.isSuccess ? <GuildRolesWorkspace guildId={guildId} roles={roles} /> : null}
    </>
  )
}
