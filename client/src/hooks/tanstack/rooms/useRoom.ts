import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import type { RoomState, ApiResponse } from '@/types'

export function useRoom(code: string) {
  return useQuery({
    queryKey: ['rooms', code],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<RoomState>>(`/rooms/${code}`)
      return data.data
    },
    enabled: !!code,
  })
}
