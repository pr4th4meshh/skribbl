import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'

export function useBackendHealth() {
  const query = useQuery({
    queryKey: ['backend-health'],
    queryFn: () => api.get('/health'),
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchInterval: (q) => (q.state.status === 'error' ? 10000 : false),
    refetchIntervalInBackground: true,
  })

  return { isDown: query.isError }
}
