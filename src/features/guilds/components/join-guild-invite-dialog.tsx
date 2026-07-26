import * as Dialog from '@radix-ui/react-dialog'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { getApiErrorMessage } from '@/api/errors'
import { getGuildInvite, joinGuildByInvite, type GuildInvitePreview } from '@/api/guild'
import { Button } from '@/components/ui/button'
import { TextInput } from '@/components/ui/text-input'
import { useJoinGuildInviteDialog } from '@/stores/join-guild-invite-dialog'

import { GuildIcon } from '@/features/guilds/components/guild-icon'
import { upsertGuildFromApi } from '@/features/guilds/guild-queries'
import {
  getGuildFieldError,
  joinGuildInviteSchema,
  type JoinGuildInviteFormValues,
} from '@/features/guilds/validation'

export function JoinGuildInviteDialog() {
  const clearPendingCode = useJoinGuildInviteDialog((state) => state.clearPendingCode)
  const close = useJoinGuildInviteDialog((state) => state.close)
  const open = useJoinGuildInviteDialog((state) => state.open)
  const openState = useJoinGuildInviteDialog((state) => state.openState)
  const pendingCode = useJoinGuildInviteDialog((state) => state.pendingCode)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [manualPreview, setManualPreview] = useState<GuildInvitePreview | null>(null)
  const [manualCode, setManualCode] = useState('')

  const autoPreviewQuery = useQuery({
    enabled: openState && Boolean(pendingCode),
    queryFn: () => getGuildInvite(pendingCode!),
    queryKey: ['guild-invite-preview', pendingCode],
    retry: false,
  })

  const previewMutation = useMutation({
    mutationFn: (code: string) => getGuildInvite(code),
  })
  const joinMutation = useMutation({
    mutationFn: (code: string) => joinGuildByInvite(code),
  })

  const preview = manualPreview ?? autoPreviewQuery.data ?? null
  const inviteCode = manualCode || pendingCode || preview?.code || ''
  const lookingUp = pendingCode ? autoPreviewQuery.isPending : previewMutation.isPending
  const busy = lookingUp || joinMutation.isPending

  const resetDialog = () => {
    previewMutation.reset()
    joinMutation.reset()
    setManualPreview(null)
    setManualCode('')
  }

  const closeDialog = () => {
    if (busy) return
    resetDialog()
    close()
  }

  const goBackToCode = () => {
    if (busy) return
    joinMutation.reset()
    setManualPreview(null)
    clearPendingCode()
  }

  const handleLookup = async ({ code }: JoinGuildInviteFormValues) => {
    const trimmed = code.trim()
    clearPendingCode()
    try {
      const nextPreview = await previewMutation.mutateAsync(trimmed)
      setManualCode(trimmed)
      setManualPreview(nextPreview)
    } catch {
      setManualCode(trimmed)
      setManualPreview(null)
    }
  }

  const handleJoin = async () => {
    if (!preview) return
    try {
      const result = await joinMutation.mutateAsync(inviteCode || preview.code)
      upsertGuildFromApi(queryClient, result.guild)
      resetDialog()
      close()
      void navigate({ params: { guildId: result.guild.id }, to: '/guilds/$guildId' })
    } catch {
      // The mutation exposes a safe, user-facing error below.
    }
  }

  const lookupError = pendingCode
    ? autoPreviewQuery.error
      ? getApiErrorMessage(
          autoPreviewQuery.error,
          'Unable to find this invite. Check the code and try again.',
        )
      : undefined
    : previewMutation.error
      ? getApiErrorMessage(
          previewMutation.error,
          'Unable to find this invite. Check the code and try again.',
        )
      : undefined

  const joinError = joinMutation.error
    ? getApiErrorMessage(joinMutation.error, 'Unable to join this community. Please try again.')
    : undefined

  const error = preview ? joinError : lookupError

  return (
    <Dialog.Root
      open={openState}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          open()
        } else {
          closeDialog()
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-canvas/75 backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in" />
        <Dialog.Content
          aria-busy={busy || undefined}
          className="fixed top-1/2 left-1/2 z-50 w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-shell border border-line bg-surface p-5 text-ink shadow-panel outline-none sm:p-6"
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault()
          }}
          onPointerDownOutside={(event) => {
            if (busy) event.preventDefault()
          }}
        >
          <div className="mb-6 flex items-start gap-4 pr-8">
            <span
              aria-hidden="true"
              className="grid size-11 shrink-0 place-items-center rounded-panel border border-brand/25 bg-brand-soft text-xl font-bold text-brand-text"
            >
              ↗
            </span>
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-semibold tracking-[-0.02em]">
                {preview ? 'Join this community?' : 'Join with an invite'}
              </Dialog.Title>
              <Dialog.Description className="mt-1.5 text-sm leading-6 text-muted">
                {preview
                  ? 'Confirm you want to join. You can leave later from the community.'
                  : 'Enter an invite code to preview a community before you join.'}
              </Dialog.Description>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close join invite dialog"
            disabled={busy}
            className="absolute top-4 right-4 grid size-8 place-items-center rounded-control text-lg text-subtle transition hover:bg-surface-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 disabled:cursor-not-allowed disabled:opacity-45"
            onClick={closeDialog}
          >
            ×
          </button>

          {preview ? (
            <JoinInviteConfirm
              error={error}
              loading={joinMutation.isPending}
              preview={preview}
              onBack={goBackToCode}
              onJoin={() => void handleJoin()}
            />
          ) : (
            <JoinInviteCodeForm
              key={inviteCode || 'empty'}
              defaultCode={inviteCode}
              error={error}
              loading={lookingUp}
              onCancel={closeDialog}
              onSubmit={handleLookup}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function JoinInviteCodeForm({
  defaultCode = '',
  error,
  loading = false,
  onCancel,
  onSubmit,
}: {
  defaultCode?: string
  error?: string
  loading?: boolean
  onCancel: () => void
  onSubmit: (values: JoinGuildInviteFormValues) => Promise<void> | void
}) {
  const form = useForm({
    defaultValues: { code: defaultCode } satisfies JoinGuildInviteFormValues,
    validators: { onSubmit: joinGuildInviteSchema },
    onSubmit: async ({ value }) => onSubmit(joinGuildInviteSchema.parse(value)),
  })

  return (
    <form
      noValidate
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      {error ? (
        <div
          role="alert"
          className="rounded-control border border-negative/25 bg-negative/10 px-3 py-2.5 text-sm text-negative"
        >
          {error}
        </div>
      ) : null}

      <form.Field name="code">
        {(field) => (
          <TextInput
            required
            autoComplete="off"
            disabled={loading}
            error={getGuildFieldError(field.state.meta.errors)}
            hint="Ask a community member for a code if you do not have one."
            label="Invite code"
            name={field.name}
            placeholder="cordis-hello"
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value)}
          />
        )}
      </form.Field>

      <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
        <Button disabled={loading} type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button loading={loading || isSubmitting} type="submit">
              Continue
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}

function JoinInviteConfirm({
  error,
  loading = false,
  onBack,
  onJoin,
  preview,
}: {
  error?: string
  loading?: boolean
  onBack: () => void
  onJoin: () => void
  preview: GuildInvitePreview
}) {
  return (
    <div className="grid gap-5">
      {error ? (
        <div
          role="alert"
          className="rounded-control border border-negative/25 bg-negative/10 px-3 py-2.5 text-sm text-negative"
        >
          {error}
        </div>
      ) : null}

      <div className="rounded-panel border border-line bg-surface-raised p-4">
        <div className="flex items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-panel border border-line bg-surface text-brand-text">
            <GuildIcon
              guildId={preview.guildId}
              iconAssetId={preview.guildIconAssetId}
              name={preview.guildName}
              size="settings"
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-ink">{preview.guildName}</p>
            <p className="mt-1 text-xs text-subtle">
              {formatMemberCount(preview.memberCount)}
              <span aria-hidden="true"> · </span>
              {formatInviteExpiry(preview.expiresAt)}
            </p>
            {preview.guildDescription ? (
              <p className="mt-3 text-sm leading-6 text-muted">{preview.guildDescription}</p>
            ) : (
              <p className="mt-3 text-sm leading-6 text-subtle">No description yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
        <Button disabled={loading} type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button loading={loading} type="button" onClick={onJoin}>
          Join community
        </Button>
      </div>
    </div>
  )
}

function formatMemberCount(count: number) {
  return `${count.toLocaleString()} ${count === 1 ? 'member' : 'members'}`
}

function formatInviteExpiry(expiresAt: number) {
  if (expiresAt === 0) {
    return 'Invite never expires'
  }
  if (expiresAt <= Date.now()) {
    return 'Invite expired'
  }
  return `Invite expires ${new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(expiresAt)}`
}
