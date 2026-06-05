import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import type { User, ApiResponse } from '@/types'

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<User>>('/auth/me')
      return data.data
    },
    retry: false,
  })
}
