import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'

import { createGuildRole, type GuildRole } from '@/api/guild'
import { getApiErrorMessage } from '@/api/errors'
import { getIdempotencyKeyForIntent, type IdempotencyIntent } from '@/api/idempotency'
import { Button } from '@/components/ui/button'
import { TextInput } from '@/components/ui/text-input'

import { upsertGuildRoleFromApi } from '@/features/guilds/guild-queries'
import {
  getGuildFieldError,
  guildRoleSchema,
  type GuildRoleFormValues,
} from '@/features/guilds/validation'

interface GuildRoleCreateFormProps {
  guildId: string
  onCancel: () => void
  onCreated: (role: GuildRole) => void
}

export function GuildRoleCreateForm({ guildId, onCancel, onCreated }: GuildRoleCreateFormProps) {
  const queryClient = useQueryClient()
  const intentRef = useRef<IdempotencyIntent | undefined>(undefined)
  const mutation = useMutation({
    mutationFn: ({
      idempotencyKey,
      values,
    }: {
      idempotencyKey: string
      values: GuildRoleFormValues
    }) => createGuildRole(guildId, { ...values, idempotencyKey }),
  })
  const form = useForm({
    defaultValues: { name: '', permissions: '0' } satisfies GuildRoleFormValues,
    validators: { onSubmit: guildRoleSchema },
    onSubmit: async ({ value }) => {
      const values = guildRoleSchema.parse(value)
      const intent = getIdempotencyKeyForIntent(
        intentRef.current,
        JSON.stringify({
          guildId,
          name: values.name.trim(),
          permissions: values.permissions,
        }),
      )
      intentRef.current = intent
      try {
        const role = await mutation.mutateAsync({ idempotencyKey: intent.key, values })
        intentRef.current = undefined
        upsertGuildRoleFromApi(queryClient, role)
        onCreated(role)
      } catch {
        // The mutation error is rendered below while the form remains available.
      }
    },
  })
  const error = mutation.error
    ? getApiErrorMessage(mutation.error, 'Unable to create this role. Please try again.')
    : undefined
  const handleCancel = () => {
    intentRef.current = undefined
    onCancel()
  }

  return (
    <form
      noValidate
      className="grid gap-3 border-b border-line p-3"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      {error ? (
        <p role="alert" className="text-xs text-negative">
          {error}
        </p>
      ) : null}
      <form.Field name="name">
        {(field) => (
          <TextInput
            required
            autoFocus
            autoComplete="off"
            disabled={mutation.isPending}
            error={getGuildFieldError(field.state.meta.errors)}
            label="Role name"
            name={field.name}
            placeholder="New role"
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value)}
          />
        )}
      </form.Field>
      <div className="flex justify-end gap-2">
        <Button size="small" variant="ghost" disabled={mutation.isPending} onClick={handleCancel}>
          Cancel
        </Button>
        <Button size="small" type="submit" loading={mutation.isPending}>
          Create
        </Button>
      </div>
    </form>
  )
}
