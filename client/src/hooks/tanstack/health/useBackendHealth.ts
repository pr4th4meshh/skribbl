import { useQuery } from '@tanstack/react-query'

const BASE_URL = (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:6969'

export function useBackendHealth() {
  const query = useQuery({
    queryKey: ['backend-health'],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(5000) })
      if (!res.ok) throw new Error('unhealthy')
      return true
    },
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchInterval: (q) => (q.state.status === 'error' ? 10000 : false),
    refetchIntervalInBackground: true,
  })

  return { isDown: query.isError }
}
