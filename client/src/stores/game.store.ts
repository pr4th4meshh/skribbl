import { create } from 'zustand'
import type { RoomState, ChatMessage } from '@/types'
import type { Socket } from 'socket.io-client'

interface GameStore {
  socket: Socket | null
  roomState: RoomState | null
  messages: ChatMessage[]
  playerId: string | null
  setSocket: (socket: Socket) => void
  clearSocket: () => void
  setRoomState: (state: RoomState) => void
  patchRoomState: (patch: Partial<RoomState>) => void
  addMessage: (msg: ChatMessage) => void
  setMessages: (msgs: ChatMessage[]) => void
  setPlayerId: (id: string) => void
  reset: () => void
}

export const useGameStore = create<GameStore>()((set, get) => ({
  socket: null,
  roomState: null,
  messages: [],
  playerId: null,
  setSocket: (socket) => set({ socket }),
  clearSocket: () => {
    get().socket?.disconnect()
    set({ socket: null })
  },
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
