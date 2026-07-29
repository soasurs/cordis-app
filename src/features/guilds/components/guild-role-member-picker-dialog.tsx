import * as Dialog from '@radix-ui/react-dialog'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { addGuildRoleMembers } from '@/api/guild'
import { getApiErrorMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { GuildMemberIdentity } from '@/features/guilds/components/guild-member-identity'
import {
  SettingsEmptyState,
  SettingsListError,
  SettingsListSkeleton,
} from '@/features/guilds/components/guild-settings-list-states'
import {
  addGuildRoleMembersFromApi,
  guildMembersInfiniteQueryOptions,
  setGuildMemberRoleAssignment,
  type GuildMemberSummary,
  type GuildRoleSummary,
} from '@/features/guilds/guild-queries'

interface GuildRoleMemberPickerDialogProps {
  assignedUserIds: ReadonlySet<string>
  onClose: () => void
  role: GuildRoleSummary
}

export function GuildRoleMemberPickerDialog({
  assignedUserIds,
  onClose,
  role,
}: GuildRoleMemberPickerDialogProps) {
  const queryClient = useQueryClient()
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(() => new Set())
  const membersQuery = useInfiniteQuery(guildMembersInfiniteQueryOptions(role.guildId))
  const members = membersQuery.data?.pages.flatMap((page) => page.members) ?? []
  const addMutation = useMutation({
    mutationFn: (userIds: string[]) => addGuildRoleMembers(role.guildId, role.id, userIds),
  })
  const closeDialog = () => {
    if (!addMutation.isPending) onClose()
  }
  const error = addMutation.error
    ? getApiErrorMessage(addMutation.error, 'Unable to add role members. Please try again.')
    : undefined
  const selectableCount = members.filter((member) => !assignedUserIds.has(member.userId)).length

  const toggleMember = (member: GuildMemberSummary) => {
    if (assignedUserIds.has(member.userId)) return
    setSelectedUserIds((current) => {
      const next = new Set(current)
      if (next.has(member.userId)) next.delete(member.userId)
      else next.add(member.userId)
      return next
    })
  }

  const submit = async () => {
    const userIds = [...selectedUserIds]
    if (userIds.length === 0) return
    const selectedMembers = members.filter((member) => selectedUserIds.has(member.userId))
    try {
      await addMutation.mutateAsync(userIds)
      for (const userId of userIds) {
        setGuildMemberRoleAssignment(queryClient, role.guildId, userId, role, true)
      }
      addGuildRoleMembersFromApi(queryClient, role.guildId, role.id, selectedMembers)
      onClose()
    } catch {
      // The mutation error is rendered below while the dialog remains open.
    }
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && closeDialog()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-canvas/75 backdrop-blur-sm" />
        <Dialog.Content
          aria-busy={addMutation.isPending || undefined}
          className="fixed top-1/2 left-1/2 z-50 flex max-h-[min(40rem,calc(100vh-2rem))] w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-shell border border-line bg-surface p-5 text-ink shadow-panel outline-none sm:p-6"
          onEscapeKeyDown={(event) => {
            if (addMutation.isPending) event.preventDefault()
          }}
          onPointerDownOutside={(event) => {
            if (addMutation.isPending) event.preventDefault()
          }}
        >
          <div className="mb-5 flex items-start gap-4 pr-8">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-semibold tracking-[-0.02em]">
                Add members
              </Dialog.Title>
              <Dialog.Description className="mt-1.5 text-sm leading-6 text-muted">
                Choose who should receive {role.name}. Members who already have the role cannot be
                selected again.
              </Dialog.Description>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close add members dialog"
            disabled={addMutation.isPending}
            className="absolute top-4 right-4 grid size-8 place-items-center rounded-control text-lg text-subtle transition hover:bg-surface-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 disabled:cursor-not-allowed disabled:opacity-45"
            onClick={closeDialog}
          >
            ×
          </button>

          <div className="min-h-0 flex-1 overflow-y-auto">
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
                {members.map((member) => {
                  const alreadyAssigned = assignedUserIds.has(member.userId)
                  const selected = alreadyAssigned || selectedUserIds.has(member.userId)
                  return (
                    <li
                      className="border-b border-line px-4 py-3 last:border-b-0"
                      key={member.userId}
                    >
                      <label
                        className={`flex items-center gap-4 ${
                          alreadyAssigned ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                        }`}
                      >
                        <GuildMemberIdentity member={member} />
                        <input
                          type="checkbox"
                          aria-label={
                            alreadyAssigned
                              ? `${member.userId} already has ${role.name}`
                              : `Add ${role.name} to user ${member.userId}`
                          }
                          checked={selected}
                          className="size-4 shrink-0 accent-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed"
                          disabled={alreadyAssigned || addMutation.isPending}
                          onChange={() => toggleMember(member)}
                        />
                      </label>
                    </li>
                  )
                })}
              </ul>
            ) : null}
            {membersQuery.hasNextPage ? (
              <div className="mt-3 flex justify-center">
                <Button
                  disabled={addMutation.isPending}
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

          {error ? (
            <p role="alert" className="mt-4 text-sm text-negative">
              {error}
            </p>
          ) : null}

          <div className="mt-5 flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
            <Button
              disabled={addMutation.isPending}
              type="button"
              variant="ghost"
              onClick={closeDialog}
            >
              Cancel
            </Button>
            <Button
              disabled={selectedUserIds.size === 0 || selectableCount === 0}
              loading={addMutation.isPending}
              type="button"
              onClick={() => void submit()}
            >
              {selectedUserIds.size > 0
                ? `Add ${selectedUserIds.size} member${selectedUserIds.size === 1 ? '' : 's'}`
                : 'Add members'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
