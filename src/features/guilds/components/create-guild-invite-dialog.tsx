import * as Dialog from '@radix-ui/react-dialog'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'

import { getApiErrorMessage } from '@/api/errors'
import { createGuildInvite } from '@/api/guild'
import { getIdempotencyKeyForIntent, type IdempotencyIntent } from '@/api/idempotency'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'

import { buildGuildInviteUrl } from '@/features/guilds/invite-links'
import { prependGuildInviteFromApi } from '@/features/guilds/guild-queries'

const MS_PER_DAY = 24 * 60 * 60 * 1000

const expiresOptions = [
  { label: 'Never', value: '0' },
  { label: '1 day', value: String(MS_PER_DAY) },
  { label: '7 days', value: String(7 * MS_PER_DAY) },
  { label: '30 days', value: String(30 * MS_PER_DAY) },
]

const maxUsesOptions = [
  { label: 'Unlimited', value: '0' },
  { label: '1 use', value: '1' },
  { label: '5 uses', value: '5' },
  { label: '10 uses', value: '10' },
  { label: '25 uses', value: '25' },
]

interface CreateGuildInviteDialogProps {
  guildId: string
  guildName: string
  onClose: () => void
}

export function CreateGuildInviteDialog({
  guildId,
  guildName,
  onClose,
}: CreateGuildInviteDialogProps) {
  const queryClient = useQueryClient()
  const [createdCode, setCreatedCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const intentRef = useRef<IdempotencyIntent | undefined>(undefined)
  const mutation = useMutation({
    mutationFn: ({
      idempotencyKey,
      values,
    }: {
      idempotencyKey: string
      values: { expiresInMs: number; maxUses: number }
    }) => createGuildInvite(guildId, { ...values, idempotencyKey }),
  })
  const form = useForm({
    defaultValues: {
      expiresInMs: '0',
      maxUses: '0',
    },
    onSubmit: async ({ value }) => {
      try {
        const values = {
          expiresInMs: Number(value.expiresInMs),
          maxUses: Number(value.maxUses),
        }
        const intent = getIdempotencyKeyForIntent(
          intentRef.current,
          JSON.stringify({ guildId, ...values }),
        )
        intentRef.current = intent
        const invite = await mutation.mutateAsync({ idempotencyKey: intent.key, values })
        intentRef.current = undefined
        prependGuildInviteFromApi(queryClient, invite)
        setCreatedCode(invite.code)
      } catch {
        // The mutation error is rendered below while the form remains available.
      }
    },
  })
  const closeDialog = () => {
    if (!mutation.isPending) {
      intentRef.current = undefined
      onClose()
    }
  }
  const error = mutation.error
    ? getApiErrorMessage(mutation.error, 'Unable to create this invite. Please try again.')
    : undefined
  const createdInviteUrl = createdCode ? buildGuildInviteUrl(createdCode) : null

  const copyLink = async () => {
    if (!createdInviteUrl) return
    try {
      await navigator.clipboard.writeText(createdInviteUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1_500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && closeDialog()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-canvas/75 backdrop-blur-sm" />
        <Dialog.Content
          aria-busy={mutation.isPending || undefined}
          className="fixed top-1/2 left-1/2 z-50 w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-shell border border-line bg-surface p-5 text-ink shadow-panel outline-none sm:p-6"
          onEscapeKeyDown={(event) => {
            if (mutation.isPending) event.preventDefault()
          }}
          onPointerDownOutside={(event) => {
            if (mutation.isPending) event.preventDefault()
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
                {createdCode ? 'Invite ready' : 'Create an invite'}
              </Dialog.Title>
              <Dialog.Description className="mt-1.5 text-sm leading-6 text-muted">
                {createdCode
                  ? `Share this link so people can join ${guildName}.`
                  : `Create a shareable invite for ${guildName}.`}
              </Dialog.Description>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close create invite dialog"
            disabled={mutation.isPending}
            className="absolute top-4 right-4 grid size-8 place-items-center rounded-control text-lg text-subtle transition hover:bg-surface-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 disabled:cursor-not-allowed disabled:opacity-45"
            onClick={closeDialog}
          >
            ×
          </button>

          {createdCode && createdInviteUrl ? (
            <div className="grid gap-4">
              <div className="rounded-control border border-line bg-canvas/70 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-subtle">
                  Invite link
                </p>
                <p className="mt-2 break-all font-mono text-sm font-semibold tracking-wide text-ink">
                  {createdInviteUrl}
                </p>
                <p className="mt-2 text-xs text-subtle">Code {createdCode}</p>
              </div>
              <div className="mt-1 flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" onClick={closeDialog}>
                  Done
                </Button>
                <Button type="button" onClick={() => void copyLink()}>
                  {copied ? 'Copied' : 'Copy link'}
                </Button>
              </div>
            </div>
          ) : (
            <form
              noValidate
              className="grid gap-4"
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

              <form.Field name="expiresInMs">
                {(field) => (
                  <Select
                    disabled={mutation.isPending}
                    hint="After this time the invite can no longer be used."
                    label="Expires"
                    name={field.name}
                    options={expiresOptions}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                )}
              </form.Field>

              <form.Field name="maxUses">
                {(field) => (
                  <Select
                    disabled={mutation.isPending}
                    hint="How many times this invite can be used before it stops working."
                    label="Max uses"
                    name={field.name}
                    options={maxUsesOptions}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                )}
              </form.Field>

              <div className="mt-1 flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
                <Button
                  disabled={mutation.isPending}
                  type="button"
                  variant="ghost"
                  onClick={closeDialog}
                >
                  Cancel
                </Button>
                <form.Subscribe selector={(state) => state.isSubmitting}>
                  {(isSubmitting) => (
                    <Button loading={mutation.isPending || isSubmitting} type="submit">
                      Create invite
                    </Button>
                  )}
                </form.Subscribe>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
