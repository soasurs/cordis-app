import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'

import { getApiErrorMessage } from '@/api/errors'
import { updateGuild, type UpdateGuildDetails } from '@/api/guild'
import { createIdempotencyKey } from '@/api/idempotency'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { TextInput } from '@/components/ui/text-input'

import { upsertGuildFromApi, type GuildSummary } from '@/features/guilds/guild-queries'
import {
  getGuildFieldError,
  guildIconValidationMessage,
  updateGuildSchema,
  validateGuildIconFile,
  type UpdateGuildFormValues,
} from '@/features/guilds/validation'
import { GuildIcon } from '@/features/guilds/components/guild-icon'
import { GuildIconCropDialog } from '@/features/guilds/components/guild-icon-crop-dialog'
import { uploadGuildIcon } from '@/features/guilds/upload-guild-icon'

function buildGuildUpdate(guild: GuildSummary, values: UpdateGuildFormValues): UpdateGuildDetails {
  const patch: UpdateGuildDetails = {}
  if (values.name !== guild.name) {
    patch.name = values.name
  }
  if (values.description !== guild.description) {
    patch.description = values.description
  }
  return patch
}

export function GuildOverviewSettings({ guild }: { guild: GuildSummary }) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const iconIntentRef = useRef<{ file: File; guildId: string; key: string } | undefined>(undefined)
  const [cropFile, setCropFile] = useState<File>()
  const [iconRetry, setIconRetry] = useState<{ file: File; key: string }>()
  const [selectionError, setSelectionError] = useState<string>()
  const updateMutation = useMutation({
    mutationFn: (details: UpdateGuildDetails) => updateGuild(guild.id, details),
  })
  const iconMutation = useMutation({
    mutationFn: async ({ file, idempotencyKey }: { file: File; idempotencyKey: string }) => {
      const clearIntent = () => {
        const currentIntent = iconIntentRef.current
        if (currentIntent?.file === file && currentIntent.guildId === guild.id) {
          iconIntentRef.current = undefined
        }
      }
      return uploadGuildIcon({
        file,
        guildId: guild.id,
        idempotencyKey,
        onIntentRetired: clearIntent,
      })
    },
  })
  const form = useForm({
    defaultValues: {
      description: guild.description,
      name: guild.name,
    } satisfies UpdateGuildFormValues,
    validators: { onSubmit: updateGuildSchema },
    onSubmit: async ({ value }) => {
      try {
        const parsed = updateGuildSchema.parse(value)
        const updatedGuild = await updateMutation.mutateAsync(buildGuildUpdate(guild, parsed))
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
  const error = updateMutation.error
    ? getApiErrorMessage(updateMutation.error, 'Unable to update this community. Please try again.')
    : undefined
  const iconError = selectionError
    ? selectionError
    : iconMutation.error
      ? iconMutation.error instanceof Error &&
        (iconMutation.error.message === guildIconValidationMessage.contentType ||
          iconMutation.error.message === guildIconValidationMessage.size)
        ? iconMutation.error.message
        : getApiErrorMessage(
            iconMutation.error,
            'Unable to update the community icon. Please try again.',
          )
      : undefined

  const runIconUpload = (intent: { file: File; key: string }) => {
    setIconRetry(undefined)
    void iconMutation
      .mutateAsync({ file: intent.file, idempotencyKey: intent.key })
      .then((updatedGuild) => {
        iconIntentRef.current = undefined
        setIconRetry(undefined)
        upsertGuildFromApi(queryClient, updatedGuild)
      })
      .catch(() => {
        const currentIntent = iconIntentRef.current
        if (currentIntent?.file === intent.file && currentIntent.guildId === guild.id) {
          setIconRetry({ file: intent.file, key: intent.key })
        }
      })
  }

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
          Choose the icon, name, and description members see throughout Cordis.
        </p>
      </div>

      <div className="rounded-shell border border-line bg-surface-raised p-5 shadow-panel sm:p-6">
        <GuildOverviewStatus
          error={error ?? iconError}
          saved={updateMutation.isSuccess || iconMutation.isSuccess}
          savedMessage={
            iconMutation.isSuccess && !updateMutation.isSuccess
              ? 'Community icon updated.'
              : 'Community settings saved.'
          }
        />

        <div className="grid gap-5 sm:grid-cols-[8rem_1fr]">
          <div>
            <div className="grid aspect-square place-items-center overflow-hidden rounded-panel border border-dashed border-line-strong bg-surface text-brand-text">
              <GuildIcon
                guildId={guild.id}
                iconAssetId={guild.iconAssetId}
                name={guild.name}
                size="settings"
              />
            </div>
            <input
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              aria-label="Upload community icon"
              className="sr-only"
              disabled={iconMutation.isPending}
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (!file) {
                  return
                }
                if (updateMutation.isError || updateMutation.isSuccess) {
                  updateMutation.reset()
                }
                if (iconMutation.isError || iconMutation.isSuccess) {
                  iconMutation.reset()
                }
                setIconRetry(undefined)
                const validationError = validateGuildIconFile(file)
                if (validationError) {
                  setSelectionError(validationError)
                  return
                }
                setSelectionError(undefined)
                setCropFile(file)
              }}
            />
            <Button
              className="mt-2 w-full"
              disabled={iconMutation.isPending}
              loading={iconMutation.isPending}
              size="small"
              type="button"
              variant="secondary"
              onClick={() => {
                setSelectionError(undefined)
                if (iconMutation.isError || iconMutation.isSuccess) {
                  iconMutation.reset()
                }
                setIconRetry(undefined)
                fileInputRef.current?.click()
              }}
            >
              Change icon
            </Button>
            {iconRetry ? (
              <Button
                className="mt-2 w-full"
                disabled={iconMutation.isPending}
                loading={iconMutation.isPending}
                size="small"
                type="button"
                variant="ghost"
                onClick={() => runIconUpload(iconRetry)}
              >
                Retry icon upload
              </Button>
            ) : null}
          </div>

          <form
            noValidate
            className="grid gap-5"
            onSubmit={(event) => {
              event.preventDefault()
              event.stopPropagation()
              if (iconMutation.isError || iconMutation.isSuccess) {
                iconMutation.reset()
              }
              setSelectionError(undefined)
              void form.handleSubmit()
            }}
          >
            <form.Field name="name">
              {(field) => (
                <TextInput
                  required
                  autoComplete="off"
                  disabled={updateMutation.isPending}
                  error={getGuildFieldError(field.state.meta.errors)}
                  hint="This name appears in the community rail, channel list, and member views."
                  label="Community name"
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    if (updateMutation.isError || updateMutation.isSuccess) {
                      updateMutation.reset()
                    }
                    field.handleChange(event.target.value)
                  }}
                />
              )}
            </form.Field>

            <form.Field name="description">
              {(field) => (
                <Textarea
                  autoComplete="off"
                  disabled={updateMutation.isPending}
                  error={getGuildFieldError(field.state.meta.errors)}
                  hint="Shown on invites and the community profile. Leave blank for no description."
                  label="Description"
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    if (updateMutation.isError || updateMutation.isSuccess) {
                      updateMutation.reset()
                    }
                    field.handleChange(event.target.value)
                  }}
                />
              )}
            </form.Field>

            <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
              <Button
                disabled={updateMutation.isPending}
                type="button"
                variant="ghost"
                onClick={() => {
                  updateMutation.reset()
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
      </div>

      {cropFile ? (
        <GuildIconCropDialog
          file={cropFile}
          onCancel={() => setCropFile(undefined)}
          onConfirm={(croppedFile) => {
            setCropFile(undefined)
            const intent =
              iconIntentRef.current?.file === croppedFile &&
              iconIntentRef.current.guildId === guild.id
                ? iconIntentRef.current
                : { file: croppedFile, guildId: guild.id, key: createIdempotencyKey() }
            iconIntentRef.current = intent
            runIconUpload(intent)
          }}
        />
      ) : null}
    </>
  )
}

function GuildOverviewStatus({
  error,
  saved,
  savedMessage,
}: {
  error?: string
  saved: boolean
  savedMessage: string
}) {
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
      {savedMessage}
    </div>
  ) : null
}
