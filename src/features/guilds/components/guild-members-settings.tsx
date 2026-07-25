import { useInfiniteQuery } from '@tanstack/react-query'

import { getApiErrorMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'

import {
  guildMembersInfiniteQueryOptions,
  type GuildSummary,
} from '@/features/guilds/guild-queries'
import { GuildMemberRow } from '@/features/guilds/components/guild-member-row'
import {
  SettingsEmptyState,
  SettingsListError,
  SettingsListSkeleton,
  SettingsPageHeading,
} from '@/features/guilds/components/guild-settings-list-states'

export function GuildMembersSettings({ guild }: { guild: GuildSummary }) {
  const membersQuery = useInfiniteQuery(guildMembersInfiniteQueryOptions(guild.id))
  const members = membersQuery.data?.pages.flatMap((page) => page.members) ?? []

  return (
    <>
      <SettingsPageHeading
        count={
          membersQuery.isSuccess
            ? `${members.length}${membersQuery.hasNextPage ? '+' : ''}`
            : undefined
        }
        description="See the people who currently belong to this community."
        eyebrow="Community access"
        title="Members"
      />

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
        <ul className="overflow-hidden rounded-shell border border-line bg-surface-raised shadow-panel">
          {members.map((member) => (
            <GuildMemberRow guildOwnerId={guild.ownerId} key={member.userId} member={member} />
          ))}
        </ul>
      ) : null}
      {membersQuery.isError && members.length > 0 ? (
        <div className="mt-4">
          <SettingsListError
            message={getApiErrorMessage(
              membersQuery.error,
              'Unable to load more community members. Please try again.',
            )}
            onRetry={() => void membersQuery.refetch()}
          />
        </div>
      ) : null}
      {membersQuery.hasNextPage ? (
        <div className="mt-5 flex justify-center">
          <Button
            loading={membersQuery.isFetchingNextPage}
            variant="secondary"
            onClick={() => void membersQuery.fetchNextPage()}
          >
            Load more members
          </Button>
        </div>
      ) : null}
    </>
  )
}
