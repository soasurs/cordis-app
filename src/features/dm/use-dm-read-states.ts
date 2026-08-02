import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import {
  dmReadStatesQueryOptions,
  mergeChannelReadStates,
} from '@/features/messages/read-state-queries'

/**
 * Merge the DM-scoped read-state snapshot once per mount so unread markers
 * survive missed realtime events while the DM list or channel is open.
 */
export function useMergeDmReadStates() {
  const queryClient = useQueryClient()
  const readStatesQuery = useQuery(dmReadStatesQueryOptions())

  useEffect(() => {
    if (!readStatesQuery.data) return
    mergeChannelReadStates(queryClient, readStatesQuery.data)
  }, [queryClient, readStatesQuery.data])

  return readStatesQuery
}
