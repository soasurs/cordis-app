import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { getApiErrorMessage } from '@/api/errors'
import { deleteGuildInvite } from '@/api/guild'
import { Button } from '@/components/ui/button'

import { buildGuildInviteUrl } from '@/features/guilds/invite-links'
import { removeGuildInviteFromApi, type GuildInviteSummary } from '@/features/guilds/guild-queries'

interface GuildInviteRowProps {
  guildId: string
  invite: GuildInviteSummary
}

export function GuildInviteRow({ guildId, invite }: GuildInviteRowProps) {
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState(false)
  const [confirmingRevoke, setConfirmingRevoke] = useState(false)
  const revokeMutation = useMutation({
    mutationFn: () => deleteGuildInvite(invite.code),
    onSuccess: () => removeGuildInviteFromApi(queryClient, guildId, invite.code),
  })
  const creatorName =
    invite.creator?.name || invite.creator?.username || `User ${invite.creatorUserId}`
  const inviteUrl = buildGuildInviteUrl(invite.code)
  const revokeError = revokeMutation.error
    ? getApiErrorMessage(revokeMutation.error, 'Unable to revoke this invite. Please try again.')
    : undefined

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1_500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <li className="border-b border-line px-4 py-4 last:border-b-0 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-mono text-sm font-semibold tracking-wide text-ink">
              {invite.code}
            </p>
            <Button size="small" variant="ghost" onClick={() => void copyLink()}>
              {copied ? 'Copied' : 'Copy link'}
            </Button>
          </div>
          <p className="mt-1 truncate text-xs text-subtle">{inviteUrl}</p>
          <p className="mt-1 truncate text-xs text-subtle">
            Created by {creatorName}
            <span aria-hidden="true"> · </span>
            {formatInviteCreated(invite.createdAt)}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 text-xs text-subtle sm:justify-end">
          <p>
            <span className="text-muted">{formatUses(invite.uses, invite.maxUses)}</span>
          </p>
          <p>
            <span className="text-muted">{formatExpiry(invite.expiresAt)}</span>
          </p>
          {confirmingRevoke ? (
            <div className="flex items-center gap-2">
              <Button
                size="small"
                disabled={revokeMutation.isPending}
                variant="ghost"
                onClick={() => setConfirmingRevoke(false)}
              >
                Cancel
              </Button>
              <Button
                size="small"
                loading={revokeMutation.isPending}
                variant="danger"
                onClick={() => revokeMutation.mutate()}
              >
                Confirm revoke
              </Button>
            </div>
          ) : (
            <Button size="small" variant="danger" onClick={() => setConfirmingRevoke(true)}>
              Revoke
            </Button>
          )}
        </div>
      </div>
      {revokeError ? (
        <p role="alert" className="mt-3 text-sm text-negative">
          {revokeError}
        </p>
      ) : null}
    </li>
  )
}

function formatUses(uses: number, maxUses: number) {
  if (maxUses === 0) {
    return `${uses} · unlimited uses`
  }
  return `${uses} / ${maxUses} uses`
}

function formatExpiry(expiresAt: number) {
  if (expiresAt === 0) {
    return 'Never expires'
  }
  if (expiresAt <= Date.now()) {
    return 'Expired'
  }
  return `Expires ${new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(expiresAt)}`
}

function formatInviteCreated(createdAt: number) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(createdAt)
}
