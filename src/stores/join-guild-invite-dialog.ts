import { create } from 'zustand'

interface JoinGuildInviteDialogState {
  clearPendingCode: () => void
  close: () => void
  open: (code?: string) => void
  openState: boolean
  pendingCode?: string
}

export const useJoinGuildInviteDialog = create<JoinGuildInviteDialogState>((set) => ({
  clearPendingCode: () => set({ pendingCode: undefined }),
  close: () => set({ openState: false, pendingCode: undefined }),
  open: (code) => {
    const trimmed = code?.trim()
    set({
      openState: true,
      pendingCode: trimmed || undefined,
    })
  },
  openState: false,
  pendingCode: undefined,
}))
