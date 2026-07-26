import { useNavigate, useParams } from '@tanstack/react-router'
import { useEffect } from 'react'

import { useJoinGuildInviteDialog } from '@/stores/join-guild-invite-dialog'

export function InviteCodeRoutePage() {
  const { code } = useParams({ from: '/_app/invite/$code' })
  const navigate = useNavigate()

  useEffect(() => {
    useJoinGuildInviteDialog.getState().open(code)
    void navigate({ replace: true, to: '/' })
  }, [code, navigate])

  return null
}
