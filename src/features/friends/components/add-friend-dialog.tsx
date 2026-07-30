import * as Dialog from '@radix-ui/react-dialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'

import { getApiErrorMessage } from '@/api/errors'
import { lookupUser, sendFriendRequest } from '@/api/relationship'
import type { PublicUserProfile } from '@/api/user'
import { Button } from '@/components/ui/button'
import { TextInput } from '@/components/ui/text-input'
import { upsertRelationshipFromApi } from '@/features/friends/relationship-queries'

export function AddFriendDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [username, setUsername] = useState('')
  const [requestSent, setRequestSent] = useState(false)
  const lookupMutation = useMutation({
    mutationFn: (exactUsername: string) => lookupUser(exactUsername),
  })
  const sendMutation = useMutation({
    mutationFn: (targetId: string) => sendFriendRequest(targetId),
    onSuccess: (relationship) => {
      upsertRelationshipFromApi(queryClient, relationship)
      setRequestSent(true)
    },
  })
  const pending = lookupMutation.isPending || sendMutation.isPending
  const closeDialog = () => {
    if (!pending) onClose()
  }
  const lookupError = lookupMutation.error
    ? getApiErrorMessage(
        lookupMutation.error,
        'Unable to find that user. Check the username and try again.',
      )
    : undefined
  const sendError = sendMutation.error
    ? getApiErrorMessage(
        sendMutation.error,
        'Unable to send this friend request. Please try again.',
      )
    : undefined

  const submitLookup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedUsername = username.trim()
    if (!normalizedUsername || lookupMutation.isPending) return
    setRequestSent(false)
    lookupMutation.reset()
    sendMutation.reset()
    lookupMutation.mutate(normalizedUsername)
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && closeDialog()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-canvas/75 backdrop-blur-sm" />
        <Dialog.Content
          aria-busy={pending || undefined}
          className="fixed top-1/2 left-1/2 z-50 w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-shell border border-line bg-surface p-5 text-ink shadow-panel outline-none sm:p-6"
          onEscapeKeyDown={(event) => {
            if (pending) event.preventDefault()
          }}
          onPointerDownOutside={(event) => {
            if (pending) event.preventDefault()
          }}
        >
          <Dialog.Title className="text-lg font-semibold tracking-[-0.02em]">
            Add a friend
          </Dialog.Title>
          <Dialog.Description className="mt-1.5 text-sm leading-6 text-muted">
            Enter their complete Cordis username. Search is exact.
          </Dialog.Description>

          <button
            type="button"
            aria-label="Close add friend dialog"
            className="absolute top-4 right-4 grid size-8 place-items-center rounded-control text-lg text-subtle transition hover:bg-surface-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={pending}
            onClick={closeDialog}
          >
            ×
          </button>

          <form className="mt-6 grid gap-3" onSubmit={submitLookup}>
            <TextInput
              autoComplete="off"
              className="min-w-0"
              disabled={pending}
              error={lookupError}
              label="Username"
              placeholder="alex_chen"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value)
                if (lookupMutation.data || lookupMutation.error) lookupMutation.reset()
                if (sendMutation.data || sendMutation.error) sendMutation.reset()
                setRequestSent(false)
              }}
            />
            <Button
              className="justify-self-start"
              disabled={!username.trim()}
              loading={lookupMutation.isPending}
              type="submit"
              variant="secondary"
            >
              Search
            </Button>
          </form>

          {lookupMutation.data ? (
            <LookupResult
              profile={lookupMutation.data}
              pending={sendMutation.isPending}
              requestSent={requestSent}
              sendError={sendError}
              onSend={() => sendMutation.mutate(lookupMutation.data.userId)}
            />
          ) : null}

          <div className="mt-6 flex justify-end border-t border-line pt-4">
            <Button disabled={pending} variant="ghost" onClick={closeDialog}>
              {requestSent ? 'Done' : 'Cancel'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function LookupResult({
  onSend,
  pending,
  profile,
  requestSent,
  sendError,
}: {
  onSend: () => void
  pending: boolean
  profile: PublicUserProfile
  requestSent: boolean
  sendError?: string
}) {
  return (
    <div className="mt-5 rounded-panel border border-line bg-surface-raised p-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-control bg-surface-hover text-xs font-bold text-muted"
        >
          {getInitials(profile.name, profile.username)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">
            {profile.name || profile.username}
          </p>
          <p className="mt-1 truncate text-xs text-subtle">@{profile.username}</p>
        </div>
        {requestSent ? (
          <p className="text-xs font-semibold text-positive" role="status">
            Request sent
          </p>
        ) : (
          <Button loading={pending} size="small" onClick={onSend}>
            Send friend request
          </Button>
        )}
      </div>
      {sendError ? (
        <p className="mt-3 text-sm text-negative" role="alert">
          {sendError}
        </p>
      ) : null}
    </div>
  )
}

function getInitials(name: string, username: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
  return initials || username.slice(0, 2).toUpperCase() || 'U'
}
