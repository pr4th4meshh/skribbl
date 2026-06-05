import { create } from 'zustand'
import type { RoomState, ChatMessage } from '@/types'

interface GameStore {
  roomState: RoomState | null
  messages: ChatMessage[]
  playerId: string | null
  setRoomState: (state: RoomState) => void
  patchRoomState: (patch: Partial<RoomState>) => void
  addMessage: (msg: ChatMessage) => void
  setMessages: (msgs: ChatMessage[]) => void
  setPlayerId: (id: string) => void
  reset: () => void
}

export const useGameStore = create<GameStore>()((set, get) => ({
  roomState: null,
  messages: [],
  playerId: null,
  setRoomState: (roomState) => set({ roomState }),
  patchRoomState: (patch) => {
    const curr = get().roomState
    if (curr) set({ roomState: { ...curr, ...patch } })
  },
  addMessage: (msg) => set((s) => ({ messages: [...s.messages.slice(-199), msg] })),
  setMessages: (msgs) => set({ messages: msgs }),
  setPlayerId: (playerId) => set({ playerId }),
  reset: () => set({ roomState: null, messages: [], playerId: null }),
}))
