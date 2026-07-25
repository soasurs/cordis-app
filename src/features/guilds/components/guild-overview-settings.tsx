import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { getApiErrorMessage } from '@/api/errors'
import { updateGuild } from '@/api/guild'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { TextInput } from '@/components/ui/text-input'

import { upsertGuildFromApi, type GuildSummary } from '../guild-queries'
import { getGuildFieldError, updateGuildSchema, type UpdateGuildFormValues } from '../validation'

export function GuildOverviewSettings({ guild }: { guild: GuildSummary }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (details: UpdateGuildFormValues) => updateGuild(guild.id, details),
  })
  const form = useForm({
    defaultValues: {
      description: guild.description,
      name: guild.name,
    } satisfies UpdateGuildFormValues,
    validators: { onSubmit: updateGuildSchema },
    onSubmit: async ({ value }) => {
      try {
        const updatedGuild = await mutation.mutateAsync(updateGuildSchema.parse(value))
        form.reset({
          description: updatedGuild.description,
          name: updatedGuild.name,
        })
        upsertGuildFromApi(queryClient, updatedGuild)
      } catch {
        // The mutation error is rendered below while the form remains available.
      }
    },
  })
  const error = mutation.error
    ? getApiErrorMessage(mutation.error, 'Unable to update this community. Please try again.')
    : undefined

  return (
    <>
      <div className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-text">
          Community identity
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink">
          Community overview
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Choose the name and description members see throughout Cordis.
        </p>
      </div>

      <form
        noValidate
        className="rounded-shell border border-line bg-surface-raised p-5 shadow-panel sm:p-6"
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void form.handleSubmit()
        }}
      >
        <GuildOverviewStatus error={error} saved={mutation.isSuccess} />

        <div className="grid gap-5">
          <form.Field name="name">
            {(field) => (
              <TextInput
                required
                autoComplete="off"
                disabled={mutation.isPending}
                error={getGuildFieldError(field.state.meta.errors)}
                hint="This name appears in the community rail, channel list, and member views."
                label="Community name"
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => {
                  if (mutation.isError || mutation.isSuccess) mutation.reset()
                  field.handleChange(event.target.value)
                }}
              />
            )}
          </form.Field>

          <form.Field name="description">
            {(field) => (
              <Textarea
                autoComplete="off"
                disabled={mutation.isPending}
                error={getGuildFieldError(field.state.meta.errors)}
                hint="Shown on invites and the community profile. Leave blank for no description."
                label="Description"
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => {
                  if (mutation.isError || mutation.isSuccess) mutation.reset()
                  field.handleChange(event.target.value)
                }}
              />
            )}
          </form.Field>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
          <Button
            disabled={mutation.isPending}
            type="button"
            variant="ghost"
            onClick={() => {
              mutation.reset()
              form.reset({
                description: guild.description,
                name: guild.name,
              })
            }}
          >
            Reset
          </Button>
          <form.Subscribe
            selector={(state) =>
              [state.isSubmitting, state.values.description, state.values.name] as const
            }
          >
            {([isSubmitting, description, name]) => (
              <Button
                disabled={
                  name.trim() === guild.name && description.trim() === guild.description
                }
                loading={mutation.isPending || isSubmitting}
                type="submit"
              >
                Save changes
              </Button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </>
  )
}

function GuildOverviewStatus({ error, saved }: { error?: string; saved: boolean }) {
  if (error) {
    return (
      <div
        role="alert"
        className="mb-5 rounded-control border border-negative/25 bg-negative/10 px-3 py-2.5 text-sm text-negative"
      >
        {error}
      </div>
    )
  }

  return saved ? (
    <div
      role="status"
      className="mb-5 rounded-control border border-positive/25 bg-positive/10 px-3 py-2.5 text-sm text-positive"
    >
      Community settings saved.
    </div>
  ) : null
}
