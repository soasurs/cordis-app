import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { removeGuildRoleMembers } from '@/api/guild'
import { getApiErrorMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { GuildMemberIdentity } from '@/features/guilds/components/guild-member-identity'
import { GuildRoleMemberPickerDialog } from '@/features/guilds/components/guild-role-member-picker-dialog'
import {
  SettingsEmptyState,
  SettingsListError,
  SettingsListSkeleton,
} from '@/features/guilds/components/guild-settings-list-states'
import {
  guildRoleMembersInfiniteQueryOptions,
  removeGuildRoleMembersFromApi,
  setGuildMemberRoleAssignment,
  type GuildMemberSummary,
  type GuildRoleSummary,
} from '@/features/guilds/guild-queries'

export function GuildRoleMembers({ role }: { role: GuildRoleSummary }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const roleMembersQuery = useInfiniteQuery(
    guildRoleMembersInfiniteQueryOptions(role.guildId, role.id),
  )
  const members = roleMembersQuery.data?.pages.flatMap((page) => page.members) ?? []
  const assignedUserIds = new Set(members.map((member) => member.userId))

  if (role.isDefault) {
    return (
      <div className="grid gap-4 p-5">
        <div>
          <h4 className="text-sm font-semibold text-ink">Role members</h4>
          <p className="mt-1 text-xs leading-5 text-subtle">
            The default role is assigned to every community member automatically.
          </p>
        </div>
        <SettingsEmptyState
          description="You do not need to manage members for the default role."
          title="Everyone is included"
        />
      </div>
    )
  }

  return (
    <div className="grid gap-4 p-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-ink">Role members</h4>
          <p className="mt-1 text-xs leading-5 text-subtle">
            Members who currently have this role. New roles start empty.
          </p>
        </div>
        <Button
          aria-label="Add role members"
          size="small"
          variant="secondary"
          onClick={() => setPickerOpen(true)}
        >
          +
        </Button>
      </div>

      {roleMembersQuery.isPending ? <SettingsListSkeleton /> : null}
      {roleMembersQuery.isError && members.length === 0 ? (
        <SettingsListError
          message={getApiErrorMessage(
            roleMembersQuery.error,
            'Unable to load role members. Please try again.',
          )}
          onRetry={() => void roleMembersQuery.refetch()}
        />
      ) : null}
      {roleMembersQuery.isSuccess && members.length === 0 ? (
        <SettingsEmptyState
          description="Use + to choose community members who should receive this role."
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
      {roleMembersQuery.isError && members.length > 0 ? (
        <SettingsListError
          message={getApiErrorMessage(
            roleMembersQuery.error,
            'Unable to load more role members. Please try again.',
          )}
          onRetry={() => void roleMembersQuery.refetch()}
        />
      ) : null}
      {roleMembersQuery.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            loading={roleMembersQuery.isFetchingNextPage}
            size="small"
            variant="secondary"
            onClick={() => void roleMembersQuery.fetchNextPage()}
          >
            Load more members
          </Button>
        </div>
      ) : null}

      {pickerOpen ? (
        <GuildRoleMemberPickerDialog
          assignedUserIds={assignedUserIds}
          role={role}
          onClose={() => setPickerOpen(false)}
        />
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
  const removeMutation = useMutation({
    mutationFn: () => removeGuildRoleMembers(role.guildId, role.id, [member.userId]),
    onSuccess: () => {
      setGuildMemberRoleAssignment(queryClient, role.guildId, member.userId, role, false)
      removeGuildRoleMembersFromApi(queryClient, role.guildId, role.id, [member.userId])
    },
  })

  return (
    <li className="border-b border-line px-4 py-4 last:border-b-0">
      <div className="flex items-center gap-4">
        <GuildMemberIdentity member={member} />
        <Button
          aria-label={`Remove ${role.name} from user ${member.userId}`}
          disabled={removeMutation.isPending}
          loading={removeMutation.isPending}
          size="small"
          variant="ghost"
          onClick={() => removeMutation.mutate()}
        >
          Remove
        </Button>
      </div>
      {removeMutation.error ? (
        <p role="alert" className="mt-2 text-right text-xs text-negative">
          {getApiErrorMessage(
            removeMutation.error,
            'Unable to remove this role member. Please try again.',
          )}
        </p>
      ) : null}
    </li>
  )
}
