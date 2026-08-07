import type { ReactNode } from 'react'

import { renderMessageContent, type MentionCandidate } from '@/features/messages/mentions'

interface MessageContentPreviewProps {
  content: string
  contentPreview: string
  mentionEveryone: boolean
  mentionCandidates: MentionCandidate[]
  mentionRoleIds: string[]
  mentionUserIds: string[]
}

export function MessageContentPreview({
  content,
  contentPreview,
  mentionEveryone,
  mentionCandidates,
  mentionRoleIds,
  mentionUserIds,
}: MessageContentPreviewProps): ReactNode {
  if (!content.trim()) return contentPreview

  return renderMessageContent(
    {
      content: contentPreview,
      mentionEveryone,
      mentionRoleIds,
      mentionUserIds,
    },
    mentionCandidates,
  )
}
