import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import type { LeaderboardEntry, ApiResponse } from '@/types'

export function useLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<LeaderboardEntry[]>>('/leaderboard')
      return data.data
    },
  })
}
