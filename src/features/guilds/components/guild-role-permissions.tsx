import { Switch } from '@/components/ui/switch'

import {
  guildPermissionGroups,
  hasGuildPermission,
  toggleGuildPermission,
  type GuildPermissionGroup,
} from '@/features/guilds/components/guild-permissions'

interface GuildRolePermissionsProps {
  disabled?: boolean
  onChange: (permissions: string) => void
  permissions: string
}

export function GuildRolePermissions({
  disabled = false,
  onChange,
  permissions,
}: GuildRolePermissionsProps) {
  return (
    <div className="grid gap-6">
      {guildPermissionGroups.map((group) => (
        <PermissionGroup
          disabled={disabled}
          group={group}
          key={group.id}
          permissions={permissions}
          onChange={onChange}
        />
      ))}
    </div>
  )
}

function PermissionGroup({
  disabled,
  group,
  onChange,
  permissions,
}: {
  disabled: boolean
  group: GuildPermissionGroup
  onChange: (permissions: string) => void
  permissions: string
}) {
  return (
    <section aria-labelledby={`role-permissions-${group.id}`}>
      <h4
        id={`role-permissions-${group.id}`}
        className="text-xs font-semibold uppercase tracking-[0.12em] text-subtle"
      >
        {group.label}
      </h4>
      <ul className="mt-2 divide-y divide-line">
        {group.permissions.map((permission) => {
          const granted = hasGuildPermission(permissions, permission.value)
          return (
            <li className="flex items-start gap-3 py-3" key={permission.value}>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">{permission.label}</span>
                <span className="mt-1 block text-xs leading-5 text-subtle">
                  {permission.description}
                </span>
              </span>
              <Switch
                aria-label={permission.label}
                checked={granted}
                disabled={disabled}
                onCheckedChange={(checked) =>
                  onChange(toggleGuildPermission(permissions, permission.value, checked))
                }
              />
            </li>
          )
        })}
      </ul>
    </section>
  )
}
