import { useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'

import { getApiErrorMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'

import { CreateGuildInviteDialog } from '@/features/guilds/components/create-guild-invite-dialog'
import { GuildInviteRow } from '@/features/guilds/components/guild-invite-row'
import {
  SettingsEmptyState,
  SettingsListError,
  SettingsListSkeleton,
  SettingsPageHeading,
} from '@/features/guilds/components/guild-settings-list-states'
import {
  guildInvitesInfiniteQueryOptions,
  type GuildSummary,
} from '@/features/guilds/guild-queries'

export function GuildInvitesSettings({ guild }: { guild: GuildSummary }) {
  const [creating, setCreating] = useState(false)
  const invitesQuery = useInfiniteQuery(guildInvitesInfiniteQueryOptions(guild.id))
  const invites = invitesQuery.data?.pages.flatMap((page) => page.invites) ?? []

  return (
    <>
      <SettingsPageHeading
        action={
          <Button size="small" onClick={() => setCreating(true)}>
            Create invite
          </Button>
        }
        count={
          invitesQuery.isSuccess
            ? `${invites.length}${invitesQuery.hasNextPage ? '+' : ''}`
            : undefined
        }
        description="Share invite codes so people can join this community. Revoke a code anytime."
        eyebrow="Community access"
        title="Invites"
      />

      {invitesQuery.isPending ? <SettingsListSkeleton /> : null}
      {invitesQuery.isError && invites.length === 0 ? (
        <SettingsListError
          message={getApiErrorMessage(
            invitesQuery.error,
            'Unable to load invites. Please try again.',
          )}
          onRetry={() => void invitesQuery.refetch()}
        />
      ) : null}
      {invitesQuery.isSuccess && invites.length === 0 ? (
        <SettingsEmptyState
          description="Create an invite code and share it with people you want to bring in."
          title="No invites yet"
        />
      ) : null}
      {invites.length > 0 ? (
        <ul className="overflow-hidden rounded-shell border border-line bg-surface-raised shadow-panel">
          {invites.map((invite) => (
            <GuildInviteRow guildId={guild.id} invite={invite} key={invite.id} />
          ))}
        </ul>
      ) : null}
      {invitesQuery.isError && invites.length > 0 ? (
        <div className="mt-4">
          <SettingsListError
            message={getApiErrorMessage(
              invitesQuery.error,
              'Unable to load more invites. Please try again.',
            )}
            onRetry={() => void invitesQuery.refetch()}
          />
        </div>
      ) : null}
      {invitesQuery.hasNextPage ? (
        <div className="mt-5 flex justify-center">
          <Button
            loading={invitesQuery.isFetchingNextPage}
            variant="secondary"
            onClick={() => void invitesQuery.fetchNextPage()}
          >
            Load more invites
          </Button>
        </div>
      ) : null}

      {creating ? (
        <CreateGuildInviteDialog
          guildId={guild.id}
          guildName={guild.name}
          onClose={() => setCreating(false)}
        />
      ) : null}
    </>
  )
}
