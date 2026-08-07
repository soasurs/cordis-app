import { useQuery, useQueryClient } from '@tanstack/react-query'

import {
  findChannelMessageInCache,
  referencedMessageQueryOptions,
} from '@/features/messages/message-queries'

export function useReferencedMessage(channelId: string, referencedMessageId: string) {
  const queryClient = useQueryClient()
  const cached = findChannelMessageInCache(queryClient, channelId, referencedMessageId)
  const referencedQuery = useQuery({
    ...referencedMessageQueryOptions(referencedMessageId),
    enabled: Boolean(referencedMessageId) && !cached,
  })

  return {
    isError: referencedQuery.isError && !cached,
    referenced: cached ?? referencedQuery.data,
  }
}
