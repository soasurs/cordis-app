import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { updateGuildRole } from '@/api/guild'
import { getApiErrorMessage } from '@/api/errors'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TextInput } from '@/components/ui/text-input'

import { type GuildRoleSummary, upsertGuildRoleFromApi } from '../guild-queries'
import { getGuildFieldError, guildRoleSchema, type GuildRoleFormValues } from '../validation'
import { countGuildPermissions } from './guild-permissions'
import { GuildRoleDeleteAction } from './guild-role-delete-action'
import { GuildRoleMembers } from './guild-role-members'
import { GuildRolePermissions } from './guild-role-permissions'

export function GuildRoleEditor({ role }: { role: GuildRoleSummary }) {
  const [tab, setTab] = useState<'members' | 'permissions'>('permissions')
  const queryClient = useQueryClient()
  const updateMutation = useMutation({
    mutationFn: (values: GuildRoleFormValues) => updateGuildRole(role.guildId, role.id, values),
  })
  const form = useForm({
    defaultValues: { name: role.name, permissions: role.permissions } satisfies GuildRoleFormValues,
    validators: { onSubmit: guildRoleSchema },
    onSubmit: async ({ value }) => {
      try {
        const updatedRole = await updateMutation.mutateAsync(guildRoleSchema.parse(value))
        form.reset({ name: updatedRole.name, permissions: updatedRole.permissions })
        upsertGuildRoleFromApi(queryClient, updatedRole)
      } catch {
        // The mutation error is rendered below while the form remains available.
      }
    },
  })
  const errorMessage = updateMutation.error
    ? getApiErrorMessage(updateMutation.error, 'Unable to update this role. Please try again.')
    : undefined

  return (
    <section
      aria-labelledby={`role-${role.id}-editor-title`}
      className="overflow-hidden rounded-shell border border-line bg-surface-raised shadow-panel"
    >
      <RoleEditorHeader role={role} />
      <div
        role="tablist"
        aria-label={`${role.name} role settings`}
        className="flex border-b border-line px-3"
      >
        {(
          [
            { id: 'permissions', label: 'Permissions' },
            { id: 'members', label: 'Members' },
          ] as const
        ).map((option) => (
          <button
            type="button"
            role="tab"
            aria-controls={`role-${role.id}-${option.id}-panel`}
            aria-selected={tab === option.id}
            className={`relative px-3 py-3 text-sm font-semibold capitalize transition ${
              tab === option.id ? 'text-ink' : 'text-subtle hover:text-muted'
            }`}
            id={`role-${role.id}-${option.id}-tab`}
            key={option.id}
            onClick={() => setTab(option.id)}
          >
            {option.label}
            {tab === option.id ? (
              <span className="absolute right-3 bottom-[-1px] left-3 h-0.5 bg-brand" />
            ) : null}
          </button>
        ))}
      </div>
      {tab === 'permissions' ? (
        <form
          noValidate
          aria-labelledby={`role-${role.id}-permissions-tab`}
          id={`role-${role.id}-permissions-panel`}
          role="tabpanel"
          onSubmit={(event) => {
            event.preventDefault()
            void form.handleSubmit()
          }}
        >
          <div className="grid gap-5 p-5">
            <RoleEditorStatus error={errorMessage} saved={updateMutation.isSuccess} />
            <form.Field name="name">
              {(field) => (
                <TextInput
                  required
                  autoComplete="off"
                  disabled={updateMutation.isPending}
                  error={getGuildFieldError(field.state.meta.errors)}
                  label="Role name"
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    if (updateMutation.isError || updateMutation.isSuccess) updateMutation.reset()
                    field.handleChange(event.target.value)
                  }}
                />
              )}
            </form.Field>
            <form.Field name="permissions">
              {(field) => (
                <GuildRolePermissions
                  disabled={updateMutation.isPending}
                  permissions={field.state.value}
                  onChange={(permissions) => {
                    if (updateMutation.isError || updateMutation.isSuccess) updateMutation.reset()
                    field.handleChange(permissions)
                  }}
                />
              )}
            </form.Field>
          </div>
          <form.Subscribe selector={(state) => [state.isSubmitting, state.values] as const}>
            {([isSubmitting, values]) => (
              <RoleEditorActions
                changed={
                  values.name.trim() !== role.name || values.permissions !== role.permissions
                }
                loading={updateMutation.isPending || isSubmitting}
                onReset={() => form.reset({ name: role.name, permissions: role.permissions })}
              />
            )}
          </form.Subscribe>
        </form>
      ) : (
        <div
          aria-labelledby={`role-${role.id}-members-tab`}
          id={`role-${role.id}-members-panel`}
          role="tabpanel"
        >
          <GuildRoleMembers role={role} />
        </div>
      )}
      {!role.isDefault ? <GuildRoleDeleteAction role={role} /> : null}
    </section>
  )
}

function RoleEditorHeader({ role }: { role: GuildRoleSummary }) {
  const permissionCount = countGuildPermissions(role.permissions)
  return (
    <header className="border-b border-line px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3
          id={`role-${role.id}-editor-title`}
          className="min-w-0 flex-1 truncate text-base font-semibold text-ink"
        >
          {role.name}
        </h3>
        {role.isDefault ? <Badge tone="brand">Default</Badge> : null}
      </div>
      <p className="mt-1 text-xs text-subtle">
        {permissionCount} {permissionCount === 1 ? 'permission' : 'permissions'}
      </p>
    </header>
  )
}

function RoleEditorStatus({ error, saved }: { error?: string; saved: boolean }) {
  if (error)
    return (
      <p role="alert" className="text-sm text-negative">
        {error}
      </p>
    )
  return saved ? (
    <p role="status" className="text-sm text-positive">
      Role settings saved.
    </p>
  ) : null
}

function RoleEditorActions({
  changed,
  loading,
  onReset,
}: {
  changed: boolean
  loading: boolean
  onReset: () => void
}) {
  return (
    <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
      <Button disabled={loading} variant="ghost" onClick={onReset}>
        Reset
      </Button>
      <Button disabled={!changed} loading={loading} type="submit">
        Save changes
      </Button>
    </div>
  )
}
