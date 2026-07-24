import { create } from 'zustand'

interface CreateGuildDialogState {
  close: () => void
  open: () => void
  openState: boolean
}

export const useCreateGuildDialog = create<CreateGuildDialogState>((set) => ({
  close: () => set({ openState: false }),
  open: () => set({ openState: true }),
  openState: false,
}))
