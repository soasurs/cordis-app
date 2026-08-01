import * as Dialog from '@radix-ui/react-dialog'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'

import { createGuild } from '@/api/guild'
import { getApiErrorMessage } from '@/api/errors'
import { getIdempotencyKeyForIntent, type IdempotencyIntent } from '@/api/idempotency'
import { Button } from '@/components/ui/button'
import { TextInput } from '@/components/ui/text-input'
import { useCreateGuildDialog } from '@/stores/create-guild-dialog'

import { upsertGuildFromApi } from '@/features/guilds/guild-queries'
import {
  createGuildSchema,
  getGuildFieldError,
  type CreateGuildFormValues,
} from '@/features/guilds/validation'

interface CreateGuildFormProps {
  error?: string
  loading?: boolean
  onCancel: () => void
  onSubmit: (values: CreateGuildFormValues) => Promise<void> | void
}

export function CreateGuildForm({
  error,
  loading = false,
  onCancel,
  onSubmit,
}: CreateGuildFormProps) {
  const form = useForm({
    defaultValues: { name: '' } satisfies CreateGuildFormValues,
    validators: { onSubmit: createGuildSchema },
    onSubmit: async ({ value }) => onSubmit(createGuildSchema.parse(value)),
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

      <form.Field name="name">
        {(field) => (
          <TextInput
            required
            autoComplete="off"
            disabled={loading}
            error={getGuildFieldError(field.state.meta.errors)}
            hint="You can change this later in community settings."
            label="Community name"
            name={field.name}
            placeholder="Cordis Studio"
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
              Create community
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}

export function CreateGuildDialog() {
  const close = useCreateGuildDialog((state) => state.close)
  const open = useCreateGuildDialog((state) => state.open)
  const openState = useCreateGuildDialog((state) => state.openState)
  const queryClient = useQueryClient()
  const intentRef = useRef<IdempotencyIntent | undefined>(undefined)
  const mutation = useMutation({
    mutationFn: ({ name, idempotencyKey }: { idempotencyKey: string; name: string }) =>
      createGuild(name, { idempotencyKey }),
  })

  const closeDialog = () => {
    if (mutation.isPending) {
      return
    }
    mutation.reset()
    intentRef.current = undefined
    close()
  }

  const handleSubmit = async ({ name }: CreateGuildFormValues) => {
    const intent = getIdempotencyKeyForIntent(
      intentRef.current,
      JSON.stringify({ name: name.trim() }),
    )
    intentRef.current = intent
    try {
      const guild = await mutation.mutateAsync({ idempotencyKey: intent.key, name })
      intentRef.current = undefined
      upsertGuildFromApi(queryClient, guild)
      close()
    } catch {
      // The mutation exposes a safe, user-facing error below while keeping the form available.
    }
  }

  const error = mutation.error
    ? getApiErrorMessage(mutation.error, 'Unable to create this community. Please try again.')
    : undefined

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
              className="grid size-11 shrink-0 place-items-center rounded-panel border border-brand/25 bg-brand-soft text-sm font-black text-brand-text"
            >
              C+
            </span>
            <div>
              <Dialog.Title className="text-lg font-semibold tracking-[-0.02em]">
                Create a community
              </Dialog.Title>
              <Dialog.Description className="mt-1.5 text-sm leading-6 text-muted">
                Give your new space a name. You can shape its channels and identity next.
              </Dialog.Description>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close create community dialog"
            disabled={mutation.isPending}
            className="absolute top-4 right-4 grid size-8 place-items-center rounded-control text-lg text-subtle transition hover:bg-surface-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 disabled:cursor-not-allowed disabled:opacity-45"
            onClick={closeDialog}
          >
            ×
          </button>

          <CreateGuildForm
            error={error}
            loading={mutation.isPending}
            onCancel={closeDialog}
            onSubmit={handleSubmit}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
