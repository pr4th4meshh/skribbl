import { useMutation, type UseMutationOptions } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import type { ApiResponse } from '@/types'

interface CreateRoomVars {
  name: string
  isPrivate?: boolean
  maxPlayers?: number
  rounds?: number
  drawTime?: number
  language?: string
}

interface CreateRoomResult {
  code: string
  roomId: string
}

export function useCreateRoom(options?: UseMutationOptions<CreateRoomResult, Error, CreateRoomVars>) {
  return useMutation<CreateRoomResult, Error, CreateRoomVars>({
    mutationFn: async (input) => {
      const { data } = await api.post<ApiResponse<CreateRoomResult>>('/rooms', input)
      return data.data
    },
    ...options,
  })
}
