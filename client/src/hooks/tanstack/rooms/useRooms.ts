import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import type { PublicRoom, ApiResponse } from '@/types'

export function useRooms() {
  return useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PublicRoom[]>>('/rooms')
      return data.data
    },
    refetchInterval: 10_000,
  })
}
