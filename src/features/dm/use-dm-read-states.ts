import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { InfiniteData } from '@tanstack/react-query'
import { useEffect } from 'react'

import type { DmChannelPage } from '@/api/dm'
import { mergeDmChannelsFromReconciliation } from '@/features/dm/dm-queries'
import {
  dmReadStatesQueryOptions,
  mergeChannelReadStates,
} from '@/features/messages/read-state-queries'

/**
 * Merge the DM-scoped read-state snapshot once per mount so unread markers
 * survive missed realtime events while the DM list or channel is open.
 */
export function useMergeDmReadStates(dmChannelsData: InfiniteData<DmChannelPage> | undefined) {
  const queryClient = useQueryClient()
  const readStatesQuery = useQuery(dmReadStatesQueryOptions())

  useEffect(() => {
    if (!readStatesQuery.data) return
    mergeDmChannelsFromReconciliation(queryClient, readStatesQuery.data.channels)
    mergeChannelReadStates(queryClient, readStatesQuery.data.readStates)
  }, [dmChannelsData, queryClient, readStatesQuery.data])

  return readStatesQuery
}
