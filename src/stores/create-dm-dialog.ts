import { create } from 'zustand'

interface CreateDmDialogState {
  close: () => void
  open: () => void
  openState: boolean
}

export const useCreateDmDialog = create<CreateDmDialogState>((set) => ({
  close: () => set({ openState: false }),
  open: () => set({ openState: true }),
  openState: false,
}))
