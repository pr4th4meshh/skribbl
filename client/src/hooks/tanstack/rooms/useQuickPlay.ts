import { useMutation, type UseMutationOptions } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import type { ApiResponse } from '@/types'

interface QuickPlayResult {
  // null when no public room has space
  code: string | null
}

export function useQuickPlay(options?: UseMutationOptions<QuickPlayResult, Error, void>) {
  return useMutation<QuickPlayResult, Error, void>({
    mutationFn: async () => {
      const { data } = await api.get<ApiResponse<QuickPlayResult>>('/rooms/quick-play')
      return data.data
    },
    ...options,
  })
}
