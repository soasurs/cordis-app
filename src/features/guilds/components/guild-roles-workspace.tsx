import { useState } from 'react'

import { getApiErrorMessage } from '@/api/errors'

import type { GuildRoleSummary } from '@/features/guilds/guild-queries'
import { useGuildRoleReordering } from '@/features/guilds/use-guild-role-reordering'
import { GuildRoleCreateForm } from '@/features/guilds/components/guild-role-create-form'
import { GuildRoleEditor } from '@/features/guilds/components/guild-role-editor'
import { GuildRoleList } from '@/features/guilds/components/guild-role-list'
import { SettingsEmptyState } from '@/features/guilds/components/guild-settings-list-states'

export function GuildRolesWorkspace({
  guildId,
  roles,
}: {
  guildId: string
  roles: GuildRoleSummary[]
}) {
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedRoleId, setSelectedRoleId] = useState<string>()
  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? roles[0]
  const reorderMutation = useGuildRoleReordering(guildId, roles)

  return (
    <>
      {reorderMutation.error ? (
        <p role="alert" className="mb-4 text-sm text-negative">
          {getApiErrorMessage(reorderMutation.error, 'Unable to reorder roles. Please try again.')}
        </p>
      ) : null}
      <div className="grid items-start gap-5 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <GuildRoleList
          createForm={
            createOpen ? (
              <GuildRoleCreateForm
                guildId={guildId}
                onCancel={() => setCreateOpen(false)}
                onCreated={(role) => {
                  setCreateOpen(false)
                  setSelectedRoleId(role.id)
                }}
              />
            ) : undefined
          }
          reorderPending={reorderMutation.isPending}
          roles={roles}
          selectedRoleId={selectedRole?.id}
          onCreateRole={() => setCreateOpen((open) => !open)}
          onMoveRole={(roleId, direction) => reorderMutation.mutate({ direction, roleId })}
          onSelectRole={setSelectedRoleId}
        />
        {selectedRole ? (
          <GuildRoleEditor key={selectedRole.id} role={selectedRole} />
        ) : (
          <SettingsEmptyState
            description="Create a role to start configuring community permissions."
            title="No role selected"
          />
        )}
      </div>
    </>
  )
}
