import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { addGuildMemberRole, removeGuildMemberRole } from '@/api/guild'
import { getApiErrorMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'

import {
  guildMemberRolesQueryOptions,
  guildMembersInfiniteQueryOptions,
  setGuildMemberRoleAssignment,
  type GuildMemberSummary,
  type GuildRoleSummary,
} from '../guild-queries'
import { GuildMemberIdentity } from './guild-member-identity'
import {
  SettingsEmptyState,
  SettingsListError,
  SettingsListSkeleton,
} from './guild-settings-list-states'

export function GuildRoleMembers({ role }: { role: GuildRoleSummary }) {
  const membersQuery = useInfiniteQuery(guildMembersInfiniteQueryOptions(role.guildId))
  const members = membersQuery.data?.pages.flatMap((page) => page.members) ?? []

  return (
    <div className="grid gap-4 p-5">
      <div>
        <h4 className="text-sm font-semibold text-ink">Role members</h4>
        <p className="mt-1 text-xs leading-5 text-subtle">
          {role.isDefault
            ? 'The default role is assigned to every community member automatically.'
            : 'Choose which community members receive this role.'}
        </p>
      </div>

      {membersQuery.isPending ? <SettingsListSkeleton /> : null}
      {membersQuery.isError && members.length === 0 ? (
        <SettingsListError
          message={getApiErrorMessage(
            membersQuery.error,
            'Unable to load community members. Please try again.',
          )}
          onRetry={() => void membersQuery.refetch()}
        />
      ) : null}
      {membersQuery.isSuccess && members.length === 0 ? (
        <SettingsEmptyState
          description="Members will appear here after they join the community."
          title="No members yet"
        />
      ) : null}
      {members.length > 0 ? (
        <ul className="overflow-hidden rounded-shell border border-line">
          {members.map((member) => (
            <GuildRoleMemberRow key={member.userId} member={member} role={role} />
          ))}
        </ul>
      ) : null}
      {membersQuery.isError && members.length > 0 ? (
        <SettingsListError
          message={getApiErrorMessage(
            membersQuery.error,
            'Unable to load more community members. Please try again.',
          )}
          onRetry={() => void membersQuery.refetch()}
        />
      ) : null}
      {membersQuery.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            loading={membersQuery.isFetchingNextPage}
            size="small"
            variant="secondary"
            onClick={() => void membersQuery.fetchNextPage()}
          >
            Load more members
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function GuildRoleMemberRow({
  member,
  role,
}: {
  member: GuildMemberSummary
  role: GuildRoleSummary
}) {
  const queryClient = useQueryClient()
  const rolesQuery = useQuery({
    ...guildMemberRolesQueryOptions(role.guildId, member.userId),
    enabled: !role.isDefault,
  })
  const assignmentMutation = useMutation({
    mutationFn: (assigned: boolean) =>
      assigned
        ? addGuildMemberRole(role.guildId, member.userId, role.id)
        : removeGuildMemberRole(role.guildId, member.userId, role.id),
    onSuccess: (_, assigned) => {
      setGuildMemberRoleAssignment(queryClient, role.guildId, member.userId, role, assigned)
    },
  })
  const assigned =
    role.isDefault || rolesQuery.data?.some((memberRole) => memberRole.id === role.id) === true
  const disabled =
    role.isDefault || rolesQuery.isPending || rolesQuery.isError || assignmentMutation.isPending

  return (
    <li className="border-b border-line px-4 py-4 last:border-b-0">
      <div className="flex items-center gap-4">
        <GuildMemberIdentity member={member} />
        <input
          type="checkbox"
          aria-label={`${role.name} role for user ${member.userId}`}
          checked={assigned}
          className="size-4 shrink-0 accent-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-45"
          disabled={disabled}
          onChange={(event) => assignmentMutation.mutate(event.target.checked)}
        />
      </div>
      {rolesQuery.isError ? (
        <div className="mt-2 flex items-center justify-end gap-2 text-xs text-negative">
          <span>Unable to load role status.</span>
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => void rolesQuery.refetch()}
          >
            Try again
          </button>
        </div>
      ) : null}
      {assignmentMutation.error ? (
        <p role="alert" className="mt-2 text-right text-xs text-negative">
          {getApiErrorMessage(
            assignmentMutation.error,
            'Unable to update this role member. Please try again.',
          )}
        </p>
      ) : null}
    </li>
  )
}
