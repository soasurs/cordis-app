import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { getApiErrorMessage } from '@/api/errors'
import { GuildChannelType, updateGuildChannel, type UpdateGuildChannelDetails } from '@/api/guild'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { TextInput } from '@/components/ui/text-input'
import {
  upsertGuildChannelFromApi,
  type GuildChannelSummary,
} from '@/features/guilds/guild-queries'
import {
  getGuildFieldError,
  updateGuildChannelSchema,
  type UpdateGuildChannelFormValues,
} from '@/features/guilds/validation'

function buildChannelUpdate(
  channel: GuildChannelSummary,
  values: UpdateGuildChannelFormValues,
  options: { includeTopic: boolean },
): UpdateGuildChannelDetails {
  const patch: UpdateGuildChannelDetails = {}
  if (values.name !== channel.name) {
    patch.name = values.name
  }
  if (options.includeTopic && values.topic !== channel.topic) {
    patch.topic = values.topic
  }
  return patch
}

export function ChannelOverviewSettings({ channel }: { channel: GuildChannelSummary }) {
  const queryClient = useQueryClient()
  const isCategory = channel.type === GuildChannelType.CATEGORY
  const updateMutation = useMutation({
    mutationFn: (details: UpdateGuildChannelDetails) => updateGuildChannel(channel.id, details),
  })
  const form = useForm({
    defaultValues: {
      name: channel.name,
      topic: channel.topic,
    } satisfies UpdateGuildChannelFormValues,
    validators: { onSubmit: updateGuildChannelSchema },
    onSubmit: async ({ value }) => {
      try {
        const parsed = updateGuildChannelSchema.parse(value)
        const patch = buildChannelUpdate(channel, parsed, { includeTopic: !isCategory })
        if (Object.keys(patch).length === 0) {
          form.reset({
            name: channel.name,
            topic: channel.topic,
          })
          return
        }
        const updatedChannel = await updateMutation.mutateAsync(patch)
        form.reset({
          name: updatedChannel.name,
          topic: updatedChannel.topic,
        })
        upsertGuildChannelFromApi(queryClient, updatedChannel)
      } catch {
        // The mutation error is rendered below while the form remains available.
      }
    },
  })
  const error = updateMutation.error
    ? getApiErrorMessage(updateMutation.error, 'Unable to update this channel. Please try again.')
    : undefined

  return (
    <>
      <div className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-text">
          {isCategory ? 'Category identity' : 'Channel identity'}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink">
          {isCategory ? 'Category overview' : 'Channel overview'}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          {isCategory
            ? 'Update the name members see for this category.'
            : 'Update the name and topic members see for this channel.'}
        </p>
      </div>

      <div className="rounded-shell border border-line bg-surface-raised p-5 shadow-panel sm:p-6">
        {error ? (
          <div
            role="alert"
            className="mb-5 rounded-control border border-negative/25 bg-negative/10 px-3 py-2.5 text-sm text-negative"
          >
            {error}
          </div>
        ) : null}
        {updateMutation.isSuccess && !error ? (
          <div
            role="status"
            className="mb-5 rounded-control border border-positive/25 bg-positive/10 px-3 py-2.5 text-sm text-positive"
          >
            Channel settings saved.
          </div>
        ) : null}

        <form
          noValidate
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            if (updateMutation.isError || updateMutation.isSuccess) {
              updateMutation.reset()
            }
            void form.handleSubmit()
          }}
        >
          <form.Field name="name">
            {(field) => (
              <TextInput
                autoComplete="off"
                disabled={updateMutation.isPending}
                error={getGuildFieldError(field.state.meta.errors)}
                label="Name"
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            )}
          </form.Field>

          {isCategory ? null : (
            <form.Field name="topic">
              {(field) => (
                <Textarea
                  disabled={updateMutation.isPending}
                  error={getGuildFieldError(field.state.meta.errors)}
                  hint="Optional. Shown at the top of the channel."
                  label="Topic"
                  name={field.name}
                  rows={4}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              )}
            </form.Field>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              disabled={updateMutation.isPending}
              type="button"
              variant="ghost"
              onClick={() => {
                updateMutation.reset()
                form.reset({
                  name: channel.name,
                  topic: channel.topic,
                })
              }}
            >
              Reset
            </Button>
            <form.Subscribe
              selector={(state) =>
                [state.isSubmitting, state.values.name, state.values.topic] as const
              }
            >
              {([isSubmitting, name, topic]) => (
                <Button
                  disabled={
                    name.trim() === channel.name && (isCategory || topic.trim() === channel.topic)
                  }
                  loading={updateMutation.isPending || isSubmitting}
                  type="submit"
                >
                  Save changes
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </div>
    </>
  )
}
