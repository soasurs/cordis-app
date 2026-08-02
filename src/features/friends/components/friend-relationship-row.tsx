import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { getApiErrorMessage } from '@/api/errors'
import {
  acceptFriendRequest,
  blockUser,
  declineFriendRequest,
  removeFriend,
  unblockUser,
  type RelationshipSummary,
} from '@/api/relationship'
import { Button } from '@/components/ui/button'
import { FriendIdentity } from '@/features/friends/components/friend-identity'
import {
  removeRelationshipFromApi,
  upsertRelationshipFromApi,
} from '@/features/friends/relationship-queries'

type RelationshipAction = 'accept' | 'block' | 'decline' | 'remove' | 'unblock'
type ConfirmedAction = Extract<RelationshipAction, 'block' | 'remove'>

export function FriendRelationshipRow({
  onMessage,
  relationship,
}: {
  onMessage?: (relationship: RelationshipSummary) => void
  relationship: RelationshipSummary
}) {
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState<ConfirmedAction>()
  const mutation = useMutation({
    mutationFn: (action: RelationshipAction) =>
      runRelationshipAction(action, relationship.targetId),
    onSuccess: (updatedRelationship) => {
      if (updatedRelationship) {
        upsertRelationshipFromApi(queryClient, updatedRelationship)
      } else {
        removeRelationshipFromApi(queryClient, relationship.targetId)
      }
    },
  })
  const displayName =
    relationship.profile.name || relationship.profile.username || `User ${relationship.targetId}`
  const error = mutation.error
    ? getApiErrorMessage(
        mutation.error,
        `Unable to ${relationshipActionLabel(mutation.variables)}. Please try again.`,
      )
    : undefined

  return (
    <li className="border-b border-line px-4 py-3.5 last:border-b-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <FriendIdentity relationship={relationship} />
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          {confirming ? (
            <>
              <p className="mr-1 text-xs text-negative">
                {confirming === 'block'
                  ? `Block ${displayName}?`
                  : `Remove ${displayName} from friends?`}
              </p>
              <Button
                disabled={mutation.isPending}
                size="small"
                variant="ghost"
                onClick={() => setConfirming(undefined)}
              >
                Cancel
              </Button>
              <Button
                loading={mutation.isPending}
                size="small"
                variant="danger"
                onClick={() => mutation.mutate(confirming)}
              >
                {confirming === 'block' ? 'Confirm block' : 'Confirm remove'}
              </Button>
            </>
          ) : (
            <RelationshipButtons
              disabled={mutation.isPending}
              pendingAction={mutation.variables}
              relationship={relationship}
              onMessage={onMessage}
              onAction={(action) => {
                mutation.reset()
                if (action === 'block' || (action === 'remove' && relationship.type === 'friend')) {
                  setConfirming(action)
                } else {
                  mutation.mutate(action)
                }
              }}
            />
          )}
        </div>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-negative" role="alert">
          {error}
        </p>
      ) : null}
    </li>
  )
}

function RelationshipButtons({
  disabled,
  onAction,
  onMessage,
  pendingAction,
  relationship,
}: {
  disabled: boolean
  onAction: (action: RelationshipAction) => void
  onMessage?: (relationship: RelationshipSummary) => void
  pendingAction?: RelationshipAction
  relationship: RelationshipSummary
}) {
  switch (relationship.type) {
    case 'incoming':
      return (
        <>
          <Button
            disabled={disabled}
            loading={pendingAction === 'accept'}
            size="small"
            onClick={() => onAction('accept')}
          >
            Accept
          </Button>
          <Button
            disabled={disabled}
            loading={pendingAction === 'decline'}
            size="small"
            variant="secondary"
            onClick={() => onAction('decline')}
          >
            Decline
          </Button>
        </>
      )
    case 'outgoing':
      return (
        <Button
          disabled={disabled}
          loading={pendingAction === 'remove'}
          size="small"
          variant="secondary"
          onClick={() => onAction('remove')}
        >
          Cancel request
        </Button>
      )
    case 'friend':
      return (
        <>
          {onMessage ? (
            <Button
              disabled={disabled}
              size="small"
              variant="secondary"
              onClick={() => onMessage(relationship)}
            >
              Message
            </Button>
          ) : null}
          <Button
            disabled={disabled}
            size="small"
            variant="secondary"
            onClick={() => onAction('remove')}
          >
            Remove friend
          </Button>
          <Button
            disabled={disabled}
            size="small"
            variant="danger"
            onClick={() => onAction('block')}
          >
            Block
          </Button>
        </>
      )
    case 'blocked':
      return (
        <Button
          disabled={disabled}
          loading={pendingAction === 'unblock'}
          size="small"
          variant="secondary"
          onClick={() => onAction('unblock')}
        >
          Unblock
        </Button>
      )
  }
}

async function runRelationshipAction(
  action: RelationshipAction,
  targetId: string,
): Promise<RelationshipSummary | undefined> {
  switch (action) {
    case 'accept':
      return acceptFriendRequest(targetId)
    case 'block':
      return blockUser(targetId)
    case 'decline':
      await declineFriendRequest(targetId)
      return undefined
    case 'remove':
      await removeFriend(targetId)
      return undefined
    case 'unblock':
      await unblockUser(targetId)
      return undefined
  }
}

function relationshipActionLabel(action: RelationshipAction | undefined) {
  switch (action) {
    case 'accept':
      return 'accept this friend request'
    case 'block':
      return 'block this user'
    case 'decline':
      return 'decline this friend request'
    case 'remove':
      return 'remove this relationship'
    case 'unblock':
      return 'unblock this user'
    default:
      return 'update this relationship'
  }
}
