import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { getApiErrorMessage } from '@/api/errors'
import { deleteGuildRole } from '@/api/guild'
import { Button } from '@/components/ui/button'

import { removeGuildRoleFromApi, type GuildRoleSummary } from '../guild-queries'

export function GuildRoleDeleteAction({ role }: { role: GuildRoleSummary }) {
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const mutation = useMutation({
    mutationFn: () => deleteGuildRole(role.guildId, role.id),
    onSuccess: () => removeGuildRoleFromApi(queryClient, role.guildId, role.id),
  })
  const error = mutation.error
    ? getApiErrorMessage(mutation.error, 'Unable to delete this role. Please try again.')
    : undefined

  return (
    <div className="border-t border-negative/20 bg-negative/5 px-5 py-4">
      {error ? (
        <p role="alert" className="mb-3 text-sm text-negative">
          {error}
        </p>
      ) : null}
      {confirming ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm text-negative">Delete {role.name}? This cannot be undone.</p>
          <div className="flex gap-2">
            <Button
              size="small"
              disabled={mutation.isPending}
              variant="ghost"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
            <Button
              size="small"
              loading={mutation.isPending}
              variant="danger"
              onClick={() => mutation.mutate()}
            >
              Confirm delete
            </Button>
          </div>
        </div>
      ) : (
        <Button size="small" variant="danger" onClick={() => setConfirming(true)}>
          Delete role
        </Button>
      )}
    </div>
  )
}
