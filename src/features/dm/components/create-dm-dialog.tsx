import * as Dialog from '@radix-ui/react-dialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'

import { createDmChannel } from '@/api/dm'
import { getApiErrorMessage } from '@/api/errors'
import { lookupUser } from '@/api/relationship'
import type { PublicUserProfile } from '@/api/user'
import { Button } from '@/components/ui/button'
import { TextInput } from '@/components/ui/text-input'
import { upsertDmChannelFromApi } from '@/features/dm/dm-queries'

export function CreateDmDialog({
  open,
  onClose,
  profile,
}: {
  open: boolean
  onClose: () => void
  profile?: PublicUserProfile
}) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const lookupMutation = useMutation({
    mutationFn: (exactUsername: string) => lookupUser(exactUsername),
  })
  const createMutation = useMutation({
    mutationFn: (targetId: string) => createDmChannel(targetId),
    onSuccess: (channel) => {
      upsertDmChannelFromApi(queryClient, channel)
      void navigate({
        params: { channelId: channel.channelId },
        to: '/dm/$channelId',
      })
      onClose()
    },
  })
  const pending = lookupMutation.isPending || createMutation.isPending
  const closeDialog = () => {
    if (!pending) onClose()
  }
  const lookupError = lookupMutation.error
    ? getApiErrorMessage(
        lookupMutation.error,
        'Unable to find that user. Check the username and try again.',
      )
    : undefined
  const createError = createMutation.error
    ? getApiErrorMessage(
        createMutation.error,
        'Unable to start this conversation. Please try again.',
      )
    : undefined

  const submitLookup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedUsername = username.trim()
    if (!normalizedUsername || lookupMutation.isPending) return
    lookupMutation.reset()
    createMutation.reset()
    lookupMutation.mutate(normalizedUsername)
  }

  const resultProfile = profile ?? lookupMutation.data

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && closeDialog()}>
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
            New message
          </Dialog.Title>
          <Dialog.Description className="mt-1.5 text-sm leading-6 text-muted">
            {profile
              ? 'Start a private conversation with this user.'
              : 'Enter their complete Cordis username. Search is exact.'}
          </Dialog.Description>

          <button
            type="button"
            aria-label="Close new message dialog"
            className="absolute top-4 right-4 grid size-8 place-items-center rounded-control text-lg text-subtle transition hover:bg-surface-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={pending}
            onClick={closeDialog}
          >
            ×
          </button>

          {!profile ? (
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
                  if (createMutation.data || createMutation.error) createMutation.reset()
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
          ) : null}

          {resultProfile ? (
            <DmTargetResult
              createError={createError}
              pending={createMutation.isPending}
              profile={resultProfile}
              onMessage={() => createMutation.mutate(resultProfile.userId)}
            />
          ) : null}

          <div className="mt-6 flex justify-end border-t border-line pt-4">
            <Button disabled={pending} variant="ghost" onClick={closeDialog}>
              Cancel
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function DmTargetResult({
  createError,
  onMessage,
  pending,
  profile,
}: {
  createError?: string
  onMessage: () => void
  pending: boolean
  profile: PublicUserProfile
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
        <Button loading={pending} size="small" onClick={onMessage}>
          Message
        </Button>
      </div>
      {createError ? (
        <p className="mt-3 text-sm text-negative" role="alert">
          {createError}
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
