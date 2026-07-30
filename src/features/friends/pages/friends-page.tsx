import {
  useInfiniteQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import type { RelationshipPage, RelationshipSummary, RelationshipType } from '@/api/relationship'
import { getApiErrorMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { AddFriendDialog } from '@/features/friends/components/add-friend-dialog'
import { FriendRelationshipRow } from '@/features/friends/components/friend-relationship-row'
import {
  flattenRelationships,
  relationshipListInfiniteQueryOptions,
} from '@/features/friends/relationship-queries'
import { friendsTabs, type FriendsTab } from '@/features/friends/friends-types'
import { useResolvePresenceBatches } from '@/features/presence/presence-queries'

type RelationshipListQuery = UseInfiniteQueryResult<InfiniteData<RelationshipPage>, Error>

export function FriendsPage({
  onSelectTab,
  tab,
}: {
  onSelectTab: (tab: FriendsTab) => void
  tab: FriendsTab
}) {
  const friendsQuery = useRelationshipList('friend', tab === 'all')
  const incomingQuery = useRelationshipList('incoming', tab === 'pending')
  const outgoingQuery = useRelationshipList('outgoing', tab === 'pending')
  const blockedQuery = useRelationshipList('blocked', tab === 'blocked')
  const [addingFriend, setAddingFriend] = useState(false)
  const friendPresenceBatches = useMemo(
    () =>
      tab === 'all'
        ? [flattenRelationships(friendsQuery.data).map((relationship) => relationship.targetId)]
        : [],
    [friendsQuery.data, tab],
  )
  useResolvePresenceBatches(friendPresenceBatches)

  return (
    <main className="flex min-h-0 flex-1 flex-col bg-surface">
      <header className="shrink-0 border-b border-line bg-surface/90 px-5 pt-5 backdrop-blur sm:px-7">
        <div className="mx-auto w-full max-w-5xl">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-brand-text">
            Personal space
          </p>
          <div className="mt-1 flex items-center justify-between gap-4">
            <h1 className="text-xl font-semibold tracking-[-0.025em] text-ink">Friends</h1>
            <Button size="small" onClick={() => setAddingFriend(true)}>
              Add friend
            </Button>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Keep track of your friends, requests, and blocked users.
          </p>
          <nav aria-label="Friends views" className="mt-5 flex gap-1 overflow-x-auto">
            {friendsTabs.map((item) => {
              const active = item.id === tab
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 ${
                    active
                      ? 'border-brand text-brand-text'
                      : 'border-transparent text-muted hover:text-ink'
                  }`}
                  onClick={() => onSelectTab(item.id)}
                >
                  {item.label}
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto w-full max-w-5xl">
          {tab === 'all' ? (
            <RelationshipListState
              emptyCopy="Friends you add will appear here."
              emptyTitle="No friends yet"
              queries={[friendsQuery]}
            />
          ) : null}
          {tab === 'pending' ? (
            <PendingRelationships incomingQuery={incomingQuery} outgoingQuery={outgoingQuery} />
          ) : null}
          {tab === 'blocked' ? (
            <RelationshipListState
              emptyCopy="People you block will appear here."
              emptyTitle="No blocked users"
              queries={[blockedQuery]}
            />
          ) : null}
        </div>
      </div>
      {addingFriend ? <AddFriendDialog onClose={() => setAddingFriend(false)} /> : null}
    </main>
  )
}

function useRelationshipList(type: RelationshipType, enabled: boolean) {
  return useInfiniteQuery({
    ...relationshipListInfiniteQueryOptions(type),
    enabled,
  })
}

function PendingRelationships({
  incomingQuery,
  outgoingQuery,
}: {
  incomingQuery: RelationshipListQuery
  outgoingQuery: RelationshipListQuery
}) {
  const queries = [incomingQuery, outgoingQuery]
  const incoming = flattenRelationships(incomingQuery.data)
  const outgoing = flattenRelationships(outgoingQuery.data)

  if (queries.some((query) => query.isPending)) {
    return <ListLoading />
  }

  const failedQuery = queries.find((query) => query.isError)
  if (failedQuery) {
    return (
      <ListError
        error={failedQuery.error}
        onRetry={() => {
          for (const query of queries) void query.refetch()
        }}
      />
    )
  }

  if (incoming.length === 0 && outgoing.length === 0) {
    return (
      <EmptyRelationshipList
        copy="Incoming and sent friend requests will appear here."
        title="No pending requests"
      />
    )
  }

  return (
    <div className="space-y-8">
      <RelationshipSection
        emptyCopy="You have no incoming friend requests."
        relationships={incoming}
        title="Incoming requests"
      />
      <LoadMoreButton query={incomingQuery} />
      <RelationshipSection
        emptyCopy="You have no sent friend requests."
        relationships={outgoing}
        title="Sent requests"
      />
      <LoadMoreButton query={outgoingQuery} />
    </div>
  )
}

function RelationshipListState({
  emptyCopy,
  emptyTitle,
  queries,
}: {
  emptyCopy: string
  emptyTitle: string
  queries: RelationshipListQuery[]
}) {
  if (queries.some((query) => query.isPending)) {
    return <ListLoading />
  }

  const failedQuery = queries.find((query) => query.isError)
  if (failedQuery) {
    return (
      <ListError
        error={failedQuery.error}
        onRetry={() => {
          for (const query of queries) void query.refetch()
        }}
      />
    )
  }

  const relationships = queries.flatMap((query) => flattenRelationships(query.data))
  if (relationships.length === 0) {
    return <EmptyRelationshipList copy={emptyCopy} title={emptyTitle} />
  }

  return (
    <div>
      <RelationshipRows relationships={relationships} />
      {queries.map((query, index) => (
        <LoadMoreButton key={index} query={query} />
      ))}
    </div>
  )
}

function RelationshipSection({
  emptyCopy,
  relationships,
  title,
}: {
  emptyCopy: string
  relationships: RelationshipSummary[]
  title: string
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <div className="mt-3">
        {relationships.length > 0 ? (
          <RelationshipRows relationships={relationships} />
        ) : (
          <p className="rounded-panel border border-dashed border-line px-4 py-5 text-sm text-muted">
            {emptyCopy}
          </p>
        )}
      </div>
    </section>
  )
}

function RelationshipRows({ relationships }: { relationships: RelationshipSummary[] }) {
  return (
    <ul className="overflow-hidden rounded-panel border border-line bg-surface-raised shadow-panel">
      {relationships.map((relationship) => (
        <FriendRelationshipRow key={relationship.targetId} relationship={relationship} />
      ))}
    </ul>
  )
}

function LoadMoreButton({ query }: { query: RelationshipListQuery }) {
  if (!query.hasNextPage) return null

  return (
    <div className="mt-4 flex justify-center">
      <Button
        loading={query.isFetchingNextPage}
        size="small"
        variant="secondary"
        onClick={() => void query.fetchNextPage()}
      >
        Load more
      </Button>
    </div>
  )
}

function ListLoading() {
  return (
    <div className="rounded-panel border border-line bg-surface-raised px-5 py-8" role="status">
      <p className="text-sm font-medium text-muted">Loading relationships…</p>
    </div>
  )
}

function ListError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="rounded-panel border border-negative/25 bg-negative/10 px-5 py-5" role="alert">
      <p className="text-sm font-medium text-negative">
        {getApiErrorMessage(error, 'Unable to load relationships. Please try again.')}
      </p>
      <Button className="mt-4" size="small" variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}

function EmptyRelationshipList({ copy, title }: { copy: string; title: string }) {
  return (
    <div className="rounded-panel border border-dashed border-line bg-surface-raised px-5 py-10 text-center">
      <span
        aria-hidden="true"
        className="mx-auto grid size-10 place-items-center rounded-control bg-brand-soft text-lg font-bold text-brand-text"
      >
        ◎
      </span>
      <h2 className="mt-4 text-sm font-semibold text-ink">{title}</h2>
      <p className="mt-2 text-sm text-muted">{copy}</p>
    </div>
  )
}
