import { useNavigate, useParams } from '@tanstack/react-router'

import { DmChannelPage } from '@/features/dm/pages/dm-channel-page'
import { DmListPage } from '@/features/dm/pages/dm-list-page'
import { useCreateDmDialog } from '@/stores/create-dm-dialog'

export function DmListRoutePage() {
  const navigate = useNavigate()
  const openNewDm = useCreateDmDialog((state) => state.open)

  return (
    <DmListPage
      onOpenNewDm={openNewDm}
      onSelectChannel={(channelId) => {
        void navigate({
          params: { channelId },
          to: '/dm/$channelId',
        })
      }}
    />
  )
}

export function DmChannelRoutePage() {
  const { channelId } = useParams({ from: '/_app/dm/$channelId' })
  const navigate = useNavigate()

  return (
    <DmChannelPage
      channelId={channelId}
      onBack={() => {
        void navigate({ to: '/dm' })
      }}
    />
  )
}
