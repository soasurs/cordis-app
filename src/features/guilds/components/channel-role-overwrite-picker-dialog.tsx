import * as Dialog from '@radix-ui/react-dialog'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { upsertGuildChannelPermissionOverwrite } from '@/api/guild'
import { getApiErrorMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  SettingsEmptyState,
  SettingsListError,
  SettingsListSkeleton,
} from '@/features/guilds/components/guild-settings-list-states'
import {
  guildRolesQueryOptions,
  upsertGuildChannelOverwriteFromApi,
  type GuildChannelOverwriteSummary,
  type GuildRoleSummary,
} from '@/features/guilds/guild-queries'

interface ChannelRoleOverwritePickerDialogProps {
  channelId: string
  existingRoleIds: ReadonlySet<string>
  guildId: string
  onClose: () => void
  onCreated: (overwrites: GuildChannelOverwriteSummary[]) => void
}

export function ChannelRoleOverwritePickerDialog({
  channelId,
  existingRoleIds,
  guildId,
  onClose,
  onCreated,
}: ChannelRoleOverwritePickerDialogProps) {
  const queryClient = useQueryClient()
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(() => new Set())
  const rolesQuery = useQuery(guildRolesQueryOptions(guildId))
  const roles = rolesQuery.data ?? []
  const createMutation = useMutation({
    mutationFn: async (roleIds: string[]) => {
      const created: GuildChannelOverwriteSummary[] = []
      for (const roleId of roleIds) {
        created.push(
          await upsertGuildChannelPermissionOverwrite(channelId, {
            allow: '0',
            appliesTo: 'role',
            appliesToId: roleId,
            deny: '0',
          }),
        )
      }
      return created
    },
  })
  const closeDialog = () => {
    if (!createMutation.isPending) onClose()
  }
  const error = createMutation.error
    ? getApiErrorMessage(createMutation.error, 'Unable to add role overwrites. Please try again.')
    : undefined
  const selectableCount = roles.filter((role) => !existingRoleIds.has(role.id)).length

  const toggleRole = (role: GuildRoleSummary) => {
    if (existingRoleIds.has(role.id)) return
    setSelectedRoleIds((current) => {
      const next = new Set(current)
      if (next.has(role.id)) next.delete(role.id)
      else next.add(role.id)
      return next
    })
  }

  const submit = async () => {
    const roleIds = [...selectedRoleIds]
    if (roleIds.length === 0) return
    try {
      const created = await createMutation.mutateAsync(roleIds)
      for (const overwrite of created) {
        upsertGuildChannelOverwriteFromApi(queryClient, overwrite)
      }
      onCreated(created)
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
          aria-busy={createMutation.isPending || undefined}
          className="fixed top-1/2 left-1/2 z-50 flex max-h-[min(40rem,calc(100vh-2rem))] w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-shell border border-line bg-surface p-5 text-ink shadow-panel outline-none sm:p-6"
          onEscapeKeyDown={(event) => {
            if (createMutation.isPending) event.preventDefault()
          }}
          onPointerDownOutside={(event) => {
            if (createMutation.isPending) event.preventDefault()
          }}
        >
          <div className="mb-5 flex items-start gap-4 pr-8">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-semibold tracking-[-0.02em]">
                Add role overwrite
              </Dialog.Title>
              <Dialog.Description className="mt-1.5 text-sm leading-6 text-muted">
                Choose roles that should get a channel-specific permission override. Roles that
                already have an overwrite cannot be selected again.
              </Dialog.Description>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close add role overwrite dialog"
            disabled={createMutation.isPending}
            className="absolute top-4 right-4 grid size-8 place-items-center rounded-control text-lg text-subtle transition hover:bg-surface-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 disabled:cursor-not-allowed disabled:opacity-45"
            onClick={closeDialog}
          >
            ×
          </button>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {rolesQuery.isPending ? <SettingsListSkeleton /> : null}
            {rolesQuery.isError && roles.length === 0 ? (
              <SettingsListError
                message={getApiErrorMessage(
                  rolesQuery.error,
                  'Unable to load community roles. Please try again.',
                )}
                onRetry={() => void rolesQuery.refetch()}
              />
            ) : null}
            {rolesQuery.isSuccess && roles.length === 0 ? (
              <SettingsEmptyState
                description="Create a role in community settings before adding channel overwrites."
                title="No roles yet"
              />
            ) : null}
            {roles.length > 0 ? (
              <ul className="overflow-hidden rounded-shell border border-line">
                {roles.map((role) => {
                  const alreadyAssigned = existingRoleIds.has(role.id)
                  const selected = alreadyAssigned || selectedRoleIds.has(role.id)
                  return (
                    <li className="border-b border-line px-4 py-3 last:border-b-0" key={role.id}>
                      <label
                        className={`flex items-center gap-3 ${
                          alreadyAssigned ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                        }`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-semibold text-ink">
                              {role.name}
                            </span>
                            {role.isDefault ? <Badge tone="brand">Default</Badge> : null}
                          </span>
                        </span>
                        <input
                          type="checkbox"
                          aria-label={
                            alreadyAssigned
                              ? `${role.name} already has an overwrite`
                              : `Add overwrite for ${role.name}`
                          }
                          checked={selected}
                          className="size-4 shrink-0 accent-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed"
                          disabled={alreadyAssigned || createMutation.isPending}
                          onChange={() => toggleRole(role)}
                        />
                      </label>
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </div>

          {error ? (
            <p role="alert" className="mt-4 text-sm text-negative">
              {error}
            </p>
          ) : null}

          <div className="mt-5 flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
            <Button
              disabled={createMutation.isPending}
              type="button"
              variant="ghost"
              onClick={closeDialog}
            >
              Cancel
            </Button>
            <Button
              disabled={selectedRoleIds.size === 0 || selectableCount === 0}
              loading={createMutation.isPending}
              type="button"
              onClick={() => void submit()}
            >
              {selectedRoleIds.size > 0
                ? `Add ${selectedRoleIds.size} overwrite${selectedRoleIds.size === 1 ? '' : 's'}`
                : 'Add overwrites'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
