import type { ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import type { GuildRoleSummary } from '../guild-queries'
import type { GuildRoleMoveDirection } from '../use-guild-role-reordering'
import { countGuildPermissions } from './guild-permissions'

interface GuildRoleListProps {
  createForm?: ReactNode
  onCreateRole: () => void
  onMoveRole: (roleId: string, direction: GuildRoleMoveDirection) => void
  onSelectRole: (roleId: string) => void
  reorderPending: boolean
  roles: GuildRoleSummary[]
  selectedRoleId?: string
}

export function GuildRoleList({
  createForm,
  onCreateRole,
  onMoveRole,
  onSelectRole,
  reorderPending,
  roles,
  selectedRoleId,
}: GuildRoleListProps) {
  return (
    <nav
      aria-label="Community roles"
      className="overflow-hidden rounded-shell border border-line bg-surface-raised shadow-panel lg:sticky lg:top-0 lg:max-h-[calc(100svh-2rem)] lg:overflow-y-auto"
    >
      <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
        <p className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-[0.12em] text-subtle">
          Community roles
        </p>
        <Button aria-label="Create role" size="small" variant="ghost" onClick={onCreateRole}>
          +
        </Button>
      </div>
      {createForm}
      <div className="grid gap-1 p-2">
        {roles.map((role, index) => (
          <GuildRoleListItem
            canMoveDown={
              !role.isDefault && index < roles.length - 1 && !roles[index + 1]?.isDefault
            }
            canMoveUp={!role.isDefault && index > 0}
            active={role.id === selectedRoleId}
            key={role.id}
            reorderPending={reorderPending}
            role={role}
            onMove={(direction) => onMoveRole(role.id, direction)}
            onSelect={() => onSelectRole(role.id)}
          />
        ))}
      </div>
    </nav>
  )
}

function GuildRoleListItem({
  active,
  canMoveDown,
  canMoveUp,
  onMove,
  onSelect,
  reorderPending,
  role,
}: {
  active: boolean
  canMoveDown: boolean
  canMoveUp: boolean
  onMove: (direction: GuildRoleMoveDirection) => void
  onSelect: () => void
  reorderPending: boolean
  role: GuildRoleSummary
}) {
  const permissionCount = countGuildPermissions(role.permissions)

  return (
    <div
      className={`flex items-center gap-1 rounded-control transition ${
        active
          ? 'bg-brand-soft text-brand-text'
          : 'text-muted hover:bg-surface-hover hover:text-ink'
      }`}
    >
      <button
        type="button"
        aria-label={`Select role ${role.name}`}
        aria-pressed={active}
        className="min-w-0 flex-1 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70"
        onClick={onSelect}
      >
        <span className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{role.name}</span>
          {role.isDefault ? <Badge tone="brand">Default</Badge> : null}
        </span>
        <span className="mt-1 block text-xs opacity-75">
          {permissionCount} {permissionCount === 1 ? 'permission' : 'permissions'}
        </span>
      </button>
      {!role.isDefault ? (
        <span className="mr-1 grid gap-0.5">
          <RoleMoveButton
            direction="up"
            disabled={!canMoveUp || reorderPending}
            roleName={role.name}
            onMove={onMove}
          />
          <RoleMoveButton
            direction="down"
            disabled={!canMoveDown || reorderPending}
            roleName={role.name}
            onMove={onMove}
          />
        </span>
      ) : null}
    </div>
  )
}

function RoleMoveButton({
  direction,
  disabled,
  onMove,
  roleName,
}: {
  direction: GuildRoleMoveDirection
  disabled: boolean
  onMove: (direction: GuildRoleMoveDirection) => void
  roleName: string
}) {
  return (
    <button
      type="button"
      aria-label={`Move ${roleName} ${direction}`}
      className="grid size-5 place-items-center rounded text-[0.6rem] text-subtle hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 disabled:opacity-25"
      disabled={disabled}
      onClick={() => onMove(direction)}
    >
      {direction === 'up' ? '↑' : '↓'}
    </button>
  )
}
