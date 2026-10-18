import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsStore {
  muted: boolean
  toggleMuted: () => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      muted: false,
      toggleMuted: () => set((s) => ({ muted: !s.muted })),
    }),
    { name: 'settings' },
  ),
)
