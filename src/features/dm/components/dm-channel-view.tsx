import * as Avatar from '@radix-ui/react-avatar'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'

import { resolveAvatarUrl } from '@/api/assets'
import type { DmChannelSummary } from '@/api/dm'
import { getInitials } from '@/components/layout/app-shell-types'
import { authSessionQueryOptions } from '@/features/auth/auth-session'
import { ChannelMessageView } from '@/features/messages/components/channel-message-view'
import {
  filterMentionCandidates,
  type MentionCandidate,
  type MentionCandidateSearch,
} from '@/features/messages/mentions'
import { PresenceIndicator } from '@/features/presence/components/presence-indicator'
import { useUserPresence } from '@/features/presence/presence-queries'

export function DmChannelView({ channel }: { channel: DmChannelSummary }) {
  const { recipient } = channel
  const { data: session } = useQuery(authSessionQueryOptions)
  const displayName = recipient.name || recipient.username || `User ${recipient.userId}`
  const candidates = useDmMentionCandidates(channel)
  const searchMentionCandidates = useCallback<MentionCandidateSearch>(
    async (query) => filterMentionCandidates(candidates, query),
    [candidates],
  )

  return (
    <ChannelMessageView
      canManageMessages={false}
      canMentionRolesAndEveryone={false}
      canSend={Boolean(session)}
      channelId={channel.channelId}
      channelName={displayName}
      historyStart={<DmHistoryStart channel={channel} />}
      mentionCandidates={candidates}
      messageListLabel={displayName}
      onSearchMentionCandidates={searchMentionCandidates}
    />
  )
}

function useDmMentionCandidates(channel: DmChannelSummary): MentionCandidate[] {
  const { data: session } = useQuery(authSessionQueryOptions)
  const { recipient } = channel

  return useMemo(() => {
    const candidates: MentionCandidate[] = [
      {
        id: recipient.userId,
        kind: 'user',
        label: recipient.name || recipient.username || `User ${recipient.userId}`,
        secondaryLabel: `@${recipient.username}`,
        token: `<@${recipient.userId}>`,
      },
    ]

    if (session?.user.userId) {
      const userId = session.user.userId.toString()
      candidates.push({
        id: userId,
        kind: 'user',
        label: session.profile.name || session.profile.username || `User ${userId}`,
        secondaryLabel: session.profile.username ? `@${session.profile.username}` : undefined,
        token: `<@${userId}>`,
      })
    }

    return candidates
  }, [recipient, session])
}

function DmHistoryStart({ channel }: { channel: DmChannelSummary }) {
  const { recipient } = channel
  const presence = useUserPresence(recipient.userId)
  const displayName = recipient.name || recipient.username || `User ${recipient.userId}`
  const avatarUrl = resolveAvatarUrl(recipient.userId, recipient.avatarAssetId)

  return (
    <div>
      <span className="relative inline-grid size-14 place-items-center">
        <Avatar.Root className="grid size-14 place-items-center overflow-hidden rounded-panel bg-surface-hover text-sm font-bold text-muted">
          {avatarUrl ? (
            <Avatar.Image alt="" className="size-full object-cover" src={avatarUrl} />
          ) : null}
          <Avatar.Fallback>{getInitials(recipient.name, recipient.username)}</Avatar.Fallback>
        </Avatar.Root>
        {presence ? <PresenceIndicator status={presence.status} /> : null}
      </span>
      <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-ink">{displayName}</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
        This is the beginning of your direct message conversation with @{recipient.username}.
      </p>
    </div>
  )
}
