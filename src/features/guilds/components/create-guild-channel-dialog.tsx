import * as Dialog from '@radix-ui/react-dialog'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createGuildChannel, type CreateGuildChannelDetails, type GuildChannel } from '@/api/guild'
import { getApiErrorMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { TextInput } from '@/components/ui/text-input'

import { upsertGuildChannelFromApi } from '@/features/guilds/guild-queries'
import {
  createGuildChannelSchema,
  getGuildFieldError,
  type CreateGuildChannelFormValues,
} from '@/features/guilds/validation'

interface ParentCategory {
  id: string
  name: string
}

interface CreateGuildChannelDialogProps {
  guildId: string
  guildName: string
  kind: 'category' | 'channel'
  onClose: () => void
  onCreated: (channel: GuildChannel) => void
  parentCategory?: ParentCategory
}

export function CreateGuildChannelDialog({
  guildId,
  guildName,
  kind,
  onClose,
  onCreated,
  parentCategory,
}: CreateGuildChannelDialogProps) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (values: CreateGuildChannelFormValues) => {
      const details: CreateGuildChannelDetails =
        kind === 'category'
          ? { guildId, name: values.name, type: 'category' }
          : {
              guildId,
              name: values.name,
              parentId: parentCategory?.id,
              type: values.type === 'voice' ? 'voice' : 'text',
            }
      return createGuildChannel(details)
    },
  })
  const form = useForm({
    defaultValues: {
      name: '',
      type: kind === 'category' ? 'category' : 'text',
    } as CreateGuildChannelFormValues,
    validators: { onSubmit: createGuildChannelSchema },
    onSubmit: async ({ value }) => {
      try {
        const channel = await mutation.mutateAsync(createGuildChannelSchema.parse(value))
        upsertGuildChannelFromApi(queryClient, channel)
        onCreated(channel)
      } catch {
        // The mutation error is rendered below while the form remains available.
      }
    },
  })
  const closeDialog = () => {
    if (!mutation.isPending) onClose()
  }
  const isCategory = kind === 'category'
  const title = isCategory ? 'Create a category' : 'Create a channel'
  const description = isCategory
    ? `Add a new top-level category to ${guildName}.`
    : parentCategory
      ? `Add a new channel directly inside ${parentCategory.name}.`
      : `Add a new top-level channel to ${guildName}.`
  const error = mutation.error
    ? getApiErrorMessage(mutation.error, `Unable to create this ${kind}. Please try again.`)
    : undefined

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
              {isCategory ? '□' : '#'}
            </span>
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-semibold tracking-[-0.02em]">
                {title}
              </Dialog.Title>
              <Dialog.Description className="mt-1.5 text-sm leading-6 text-muted">
                {description}
              </Dialog.Description>
            </div>
          </div>

          <button
            type="button"
            aria-label={`Close ${title.toLowerCase()} dialog`}
            disabled={mutation.isPending}
            className="absolute top-4 right-4 grid size-8 place-items-center rounded-control text-lg text-subtle transition hover:bg-surface-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 disabled:cursor-not-allowed disabled:opacity-45"
            onClick={closeDialog}
          >
            ×
          </button>

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

            <form.Field name="name">
              {(field) => (
                <TextInput
                  required
                  autoComplete="off"
                  disabled={mutation.isPending}
                  error={getGuildFieldError(field.state.meta.errors)}
                  label={isCategory ? 'Category name' : 'Channel name'}
                  name={field.name}
                  placeholder={isCategory ? 'New category' : 'new-channel'}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              )}
            </form.Field>

            {!isCategory ? (
              <form.Field name="type">
                {(field) => (
                  <Select
                    disabled={mutation.isPending}
                    hint={
                      parentCategory
                        ? 'Categories cannot be nested inside another category.'
                        : 'This channel will not belong to a category.'
                    }
                    label="Channel type"
                    name={field.name}
                    options={[
                      { label: 'Text channel', value: 'text' },
                      { label: 'Voice channel', value: 'voice' },
                    ]}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value as 'text' | 'voice')}
                  />
                )}
              </form.Field>
            ) : null}

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
                    {isCategory ? 'Create category' : 'Create channel'}
                  </Button>
                )}
              </form.Subscribe>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
