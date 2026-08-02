import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { getApiErrorMessage } from '@/api/errors'
import { ChannelRoleOverwritePickerDialog } from '@/features/guilds/components/channel-role-overwrite-picker-dialog'
import { ChannelOverwriteDetail } from '@/features/guilds/components/channel-overwrite-detail'
import { ChannelOverwriteList } from '@/features/guilds/components/channel-overwrite-list'
import { channelOverwriteKey } from '@/features/guilds/components/channel-overwrite-utils'
import {
  SettingsEmptyState,
  SettingsListError,
  SettingsListSkeleton,
} from '@/features/guilds/components/guild-settings-list-states'
import {
  guildChannelOverwritesQueryOptions,
  guildRolesQueryOptions,
  type GuildChannelOverwriteSummary,
} from '@/features/guilds/guild-queries'
import { sortGuildChannelOverwrites } from '@/features/guilds/channel-overwrite-ordering'

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
    overwrites.find((item) => channelOverwriteKey(item) === selectedKey) ?? overwrites[0]
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
          <ChannelOverwriteList
            overwrites={overwrites}
            roles={roles}
            selectedKey={selected ? channelOverwriteKey(selected) : undefined}
            onAddRole={() => setPickerOpen(true)}
            onSelect={setSelectedKey}
          />
          {selected ? (
            <ChannelOverwriteDetail
              key={channelOverwriteKey(selected)}
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
          onCreated={(created: GuildChannelOverwriteSummary[]) => {
            const first = created[0]
            if (first) setSelectedKey(channelOverwriteKey(first))
          }}
        />
      ) : null}
    </>
  )
}
