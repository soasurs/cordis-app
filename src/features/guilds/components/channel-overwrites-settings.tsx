import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

import {
  deleteGuildChannelPermissionOverwrite,
  upsertGuildChannelPermissionOverwrite,
} from '@/api/guild'
import { getApiErrorMessage } from '@/api/errors'
import type { GuildChannelPermissionOverwrite } from '@/api/guild'
import { Button } from '@/components/ui/button'
import {
  getChannelOverwritePermissionState,
  guildPermissionGroups,
  setChannelOverwritePermissionState,
  type ChannelOverwritePermissionState,
} from '@/features/guilds/components/guild-permissions'
import { ChannelRoleOverwritePickerDialog } from '@/features/guilds/components/channel-role-overwrite-picker-dialog'
import {
  SettingsEmptyState,
  SettingsListError,
  SettingsListSkeleton,
} from '@/features/guilds/components/guild-settings-list-states'
import {
  guildChannelOverwritesQueryOptions,
  guildRolesQueryOptions,
  removeGuildChannelOverwriteFromApi,
  upsertGuildChannelOverwriteFromApi,
  type GuildChannelOverwriteSummary,
  type GuildRoleSummary,
} from '@/features/guilds/guild-queries'
import { sortGuildChannelOverwrites } from '@/features/guilds/channel-overwrite-ordering'
import { userProfileQueryOptions } from '@/features/users/user-queries'

export function ChannelOverwritesSettings({
  channelId,
  guildId,
}: {
  channelId: string
  guildId: string
}) {
  const overwritesQuery = useQuery(guildChannelOverwritesQueryOptions(guildId, channelId))
  const rolesQuery = useQuery(guildRolesQueryOptions(guildId))
  const overwrites = sortGuildChannelOverwrites(overwritesQuery.data ?? [], rolesQuery.data ?? [])
  const roles = rolesQuery.data ?? []
  const [selectedKey, setSelectedKey] = useState<string>()
  const [pickerOpen, setPickerOpen] = useState(false)
  const selected =
    overwrites.find((item) => overwriteKey(item) === selectedKey) ?? overwrites[0]
  const existingRoleIds = new Set(
    overwrites.filter((item) => item.appliesTo === 'role').map((item) => item.appliesToId),
  )

  return (
    <>
      <div className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-text">
          Channel access
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink">
          Permission overwrites
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Add role overrides for this channel or category, adjust Allow / Neutral / Deny, then save.
          Category View Channel controls whether the category group appears in the sidebar.
        </p>
      </div>

      {overwritesQuery.isError && overwrites.length === 0 ? (
        <SettingsListError
          message={getApiErrorMessage(
            overwritesQuery.error,
            'Unable to load permission overwrites. Please try again.',
          )}
          onRetry={() => void overwritesQuery.refetch()}
        />
      ) : null}

      {overwritesQuery.isPending ? <SettingsListSkeleton /> : null}

      {overwritesQuery.isSuccess ? (
        <div className="grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start">
          <OverwriteList
            overwrites={overwrites}
            roles={roles}
            selectedKey={selected ? overwriteKey(selected) : undefined}
            onAddRole={() => setPickerOpen(true)}
            onSelect={setSelectedKey}
          />
          {selected ? (
            <OverwriteDetail
              key={overwriteKey(selected)}
              overwrite={selected}
              roles={roles}
              onDeleted={() => setSelectedKey(undefined)}
            />
          ) : (
            <SettingsEmptyState
              description="Use + to add a role overwrite for this channel."
              title="No overwrites yet"
            />
          )}
        </div>
      ) : null}

      {pickerOpen ? (
        <ChannelRoleOverwritePickerDialog
          channelId={channelId}
          existingRoleIds={existingRoleIds}
          guildId={guildId}
          onClose={() => setPickerOpen(false)}
          onCreated={(created) => {
            const first = created[0]
            if (first) setSelectedKey(overwriteKey(first))
          }}
        />
      ) : null}
    </>
  )
}

function OverwriteList({
  onAddRole,
  onSelect,
  overwrites,
  roles,
  selectedKey,
}: {
  onAddRole: () => void
  onSelect: (key: string) => void
  overwrites: GuildChannelOverwriteSummary[]
  roles: GuildRoleSummary[]
  selectedKey?: string
}) {
  return (
    <nav
      aria-label="Channel overwrites"
      className="overflow-hidden rounded-shell border border-line bg-surface-raised shadow-panel lg:sticky lg:top-0 lg:max-h-[calc(100svh-2rem)] lg:overflow-y-auto"
    >
      <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
        <p className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-[0.12em] text-subtle">
          Overwrites
        </p>
        <Button aria-label="Add role overwrite" size="small" variant="ghost" onClick={onAddRole}>
          +
        </Button>
      </div>
      {overwrites.length === 0 ? (
        <p className="px-3 py-4 text-xs leading-5 text-subtle">No overwrites yet.</p>
      ) : (
        <div className="grid gap-1 p-2">
          {overwrites.map((overwrite) => {
            const key = overwriteKey(overwrite)
            const active = key === selectedKey
            return (
              <button
                type="button"
                aria-current={active ? 'true' : undefined}
                className={`rounded-control px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 ${
                  active
                    ? 'bg-brand-soft text-brand-text'
                    : 'text-muted hover:bg-surface-hover hover:text-ink'
                }`}
                key={key}
                onClick={() => onSelect(key)}
              >
                <span className="block truncate text-sm font-semibold">
                  <OverwriteLabel overwrite={overwrite} roles={roles} />
                </span>
                <span className="mt-0.5 block text-xs capitalize text-subtle">
                  {overwrite.appliesTo}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </nav>
  )
}

function OverwriteDetail({
  onDeleted,
  overwrite,
  roles,
}: {
  onDeleted: () => void
  overwrite: GuildChannelOverwriteSummary
  roles: GuildRoleSummary[]
}) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState({ allow: overwrite.allow, deny: overwrite.deny })
  const [baseline, setBaseline] = useState({
    allow: overwrite.allow,
    deny: overwrite.deny,
  })
  const [savedFlash, setSavedFlash] = useState(false)
  const isDefaultEveryone =
    overwrite.appliesTo === 'role' && overwrite.appliesToId === overwrite.guildId
  const dirty = draft.allow !== overwrite.allow || draft.deny !== overwrite.deny

  // Remount via parent key handles overwrite identity changes; sync draft when
  // the same overwrite's server allow/deny change (gateway / refetch).
  if (overwrite.allow !== baseline.allow || overwrite.deny !== baseline.deny) {
    setBaseline({ allow: overwrite.allow, deny: overwrite.deny })
    setDraft({ allow: overwrite.allow, deny: overwrite.deny })
  }

  const saveMutation = useMutation({
    mutationFn: (next: { allow: string; deny: string }) =>
      upsertGuildChannelPermissionOverwrite(overwrite.channelId, {
        allow: next.allow,
        appliesTo: overwrite.appliesTo,
        appliesToId: overwrite.appliesToId,
        deny: next.deny,
      }),
    onSuccess: (updated) => {
      upsertGuildChannelOverwriteFromApi(queryClient, updated)
      setDraft({ allow: updated.allow, deny: updated.deny })
      setSavedFlash(true)
    },
  })
  const deleteMutation = useMutation({
    mutationFn: () =>
      deleteGuildChannelPermissionOverwrite(overwrite.channelId, {
        appliesTo: overwrite.appliesTo,
        appliesToId: overwrite.appliesToId,
      }),
    onSuccess: () => {
      removeGuildChannelOverwriteFromApi(
        queryClient,
        overwrite.guildId,
        overwrite.channelId,
        overwrite.appliesTo,
        overwrite.appliesToId,
      )
      onDeleted()
    },
  })
  const busy = saveMutation.isPending || deleteMutation.isPending
  const error = saveMutation.error
    ? getApiErrorMessage(
        saveMutation.error,
        'Unable to update this permission overwrite. Please try again.',
      )
    : deleteMutation.error
      ? getApiErrorMessage(
          deleteMutation.error,
          'Unable to delete this permission overwrite. Please try again.',
        )
      : undefined

  return (
    <div className="overflow-hidden rounded-shell border border-line bg-surface-raised shadow-panel">
      <div className="p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-subtle">
          {overwrite.appliesTo === 'role' ? 'Role overwrite' : 'Member overwrite'}
        </p>
        <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-ink">
          <OverwriteLabel overwrite={overwrite} roles={roles} />
        </h3>
        <p className="mt-1 text-xs text-subtle">ID {overwrite.appliesToId}</p>

        {error ? (
          <p role="alert" className="mt-4 text-sm text-negative">
            {error}
          </p>
        ) : null}
        {savedFlash && !dirty && !error ? (
          <p role="status" className="mt-4 text-sm text-positive">
            Overwrite saved.
          </p>
        ) : null}

        <div className="mt-6 grid gap-6">
          {guildPermissionGroups.map((group) => (
            <section aria-labelledby={`overwrite-group-${group.id}`} key={group.id}>
              <h4
                id={`overwrite-group-${group.id}`}
                className="text-xs font-semibold uppercase tracking-[0.12em] text-subtle"
              >
                {group.label}
              </h4>
              <ul className="mt-2 divide-y divide-line">
                {group.permissions.map((permission) => {
                  const state = getChannelOverwritePermissionState(
                    draft.allow,
                    draft.deny,
                    permission.value,
                  )
                  return (
                    <li className="flex items-start gap-3 py-3" key={permission.value}>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-ink">
                          {permission.label}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-subtle">
                          {permission.description}
                        </span>
                      </span>
                      <OverwritePermissionToggle
                        disabled={busy}
                        label={permission.label}
                        state={state}
                        onChange={(nextState) => {
                          setSavedFlash(false)
                          saveMutation.reset()
                          setDraft((current) =>
                            setChannelOverwritePermissionState(
                              current.allow,
                              current.deny,
                              permission.value,
                              nextState,
                            ),
                          )
                        }}
                      />
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button
            disabled={busy || !dirty}
            type="button"
            variant="ghost"
            onClick={() => {
              setDraft({ allow: overwrite.allow, deny: overwrite.deny })
              setSavedFlash(false)
              saveMutation.reset()
            }}
          >
            Reset
          </Button>
          <Button
            disabled={!dirty}
            loading={saveMutation.isPending}
            type="button"
            onClick={() => {
              deleteMutation.reset()
              saveMutation.mutate(draft)
            }}
          >
            Save changes
          </Button>
        </div>
      </div>

      {!isDefaultEveryone ? (
        <OverwriteDeleteAction
          busy={busy}
          label={<OverwriteLabel overwrite={overwrite} roles={roles} />}
          onDelete={() => {
            saveMutation.reset()
            setSavedFlash(false)
            deleteMutation.mutate()
          }}
          pending={deleteMutation.isPending}
        />
      ) : null}
    </div>
  )
}

function OverwriteDeleteAction({
  busy,
  label,
  onDelete,
  pending,
}: {
  busy: boolean
  label: ReactNode
  onDelete: () => void
  pending: boolean
}) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="border-t border-negative/20 bg-negative/5 px-5 py-4">
      {confirming ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm text-negative">
            Delete overwrite for {label}? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button
              size="small"
              disabled={pending}
              variant="ghost"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
            <Button size="small" loading={pending} variant="danger" onClick={onDelete}>
              Confirm delete
            </Button>
          </div>
        </div>
      ) : (
        <Button
          size="small"
          disabled={busy}
          variant="danger"
          onClick={() => setConfirming(true)}
        >
          Delete overwrite
        </Button>
      )}
    </div>
  )
}

function OverwritePermissionToggle({
  disabled,
  label,
  onChange,
  state,
}: {
  disabled?: boolean
  label: string
  onChange: (state: ChannelOverwritePermissionState) => void
  state: ChannelOverwritePermissionState
}) {
  const options = [
    { id: 'allow' as const, symbol: '✓', title: 'Allow' },
    { id: 'noop' as const, symbol: '–', title: 'Neutral' },
    { id: 'deny' as const, symbol: '×', title: 'Deny' },
  ]

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex shrink-0 overflow-hidden rounded-control border border-line"
    >
      {options.map((option) => {
        const active = state === option.id
        return (
          <button
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${label} ${option.title.toLowerCase()}`}
            className={`grid size-8 place-items-center text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-45 ${
              active
                ? option.id === 'allow'
                  ? 'bg-positive/15 text-positive'
                  : option.id === 'deny'
                    ? 'bg-negative/15 text-negative'
                    : 'bg-surface-hover text-ink'
                : 'bg-surface text-subtle hover:bg-surface-hover hover:text-ink'
            }`}
            disabled={disabled}
            key={option.id}
            title={option.title}
            onClick={() => {
              if (!active) onChange(option.id)
            }}
          >
            <span aria-hidden="true">{option.symbol}</span>
          </button>
        )
      })}
    </div>
  )
}

function OverwriteLabel({
  overwrite,
  roles,
}: {
  overwrite: GuildChannelPermissionOverwrite
  roles: GuildRoleSummary[]
}) {
  if (overwrite.appliesTo === 'role') {
    const role = roles.find((item) => item.id === overwrite.appliesToId)
    return <>{role?.name ?? `Role ${overwrite.appliesToId}`}</>
  }

  return <MemberOverwriteLabel userId={overwrite.appliesToId} />
}

function MemberOverwriteLabel({ userId }: { userId: string }) {
  const profileQuery = useQuery(userProfileQueryOptions(userId))
  const profile = profileQuery.data
  if (profile) {
    return <>{profile.name || profile.username || `User ${userId}`}</>
  }
  if (profileQuery.isPending) {
    return <>Loading member…</>
  }
  return <>User {userId}</>
}

function overwriteKey(overwrite: GuildChannelPermissionOverwrite) {
  return `${overwrite.appliesTo}:${overwrite.appliesToId}`
}
