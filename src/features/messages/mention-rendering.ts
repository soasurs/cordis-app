import { createElement, type ReactNode } from 'react'

import type { ChannelMessageSummary } from '@/features/messages/message-queries'
import { isEscaped, isMentionBoundary } from '@/features/messages/mention-parser'
import type { MentionCandidate, MentionCandidateKind } from '@/features/messages/mention-types'

export function renderMessageContent(
  message: Pick<
    ChannelMessageSummary,
    'content' | 'mentionEveryone' | 'mentionRoleIds' | 'mentionUserIds'
  >,
  candidates: MentionCandidate[],
): ReactNode[] {
  const parts: ReactNode[] = []
  const userMentionIds = new Set(message.mentionUserIds)
  const roleMentionIds = new Set(message.mentionRoleIds)
  const candidateByKey = new Map(
    candidates.map((candidate) => [`${candidate.kind}:${candidate.id}`, candidate]),
  )
  const pattern = /<@!?([0-9]+)>|<@&([0-9]+)>|@everyone(?![\p{L}\p{N}_])/gu
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(message.content))) {
    const token = match[0]
    const userId = match[1]
    const roleId = match[2]
    const isEveryone = token === '@everyone'
    const isAccepted =
      !isEscaped(message.content, match.index) &&
      (isEveryone
        ? message.mentionEveryone && isMentionBoundary(message.content, match.index)
        : userId
          ? userMentionIds.has(userId)
          : Boolean(roleId && roleMentionIds.has(roleId)))
    if (!isAccepted) continue

    if (match.index > cursor) parts.push(message.content.slice(cursor, match.index))

    const kind: MentionCandidateKind = isEveryone ? 'everyone' : userId ? 'user' : 'role'
    const id = isEveryone ? 'everyone' : (userId ?? roleId ?? '')
    const candidate = candidateByKey.get(`${kind}:${id}`)
    const label = candidate?.label ?? id
    parts.push(
      createElement(
        'span',
        {
          className:
            'rounded-md bg-brand-soft px-1.5 py-0.5 align-middle font-medium text-brand-text',
          key: `${match.index}:${token}`,
          title: candidate?.secondaryLabel,
        },
        `@${label}`,
      ),
    )
    cursor = match.index + token.length
  }

  if (cursor < message.content.length) parts.push(message.content.slice(cursor))
  return parts
}
