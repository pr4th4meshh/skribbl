import axios from 'axios'

export const api = axios.create({ baseURL: '/api/v1' })

api.interceptors.request.use((cfg) => {
  const raw = localStorage.getItem('auth')
  const token = raw ? (JSON.parse(raw) as { state?: { accessToken?: string } }).state?.accessToken : null
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const orig = err.config as typeof err.config & { _retry?: boolean }
    if (err.response?.status === 401 && !orig._retry) {
      orig._retry = true
      const raw = localStorage.getItem('auth')
      const refreshToken = raw
        ? (JSON.parse(raw) as { state?: { refreshToken?: string } }).state?.refreshToken
        : null
      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/v1/auth/refresh', { refreshToken })
          const { accessToken: newAccess, refreshToken: newRefresh } = data.data as {
            accessToken: string
            refreshToken: string
          }
          const parsed = raw ? (JSON.parse(raw) as { state?: Record<string, unknown> }) : { state: {} }
          parsed.state = { ...parsed.state, accessToken: newAccess, refreshToken: newRefresh }
          localStorage.setItem('auth', JSON.stringify(parsed))
          orig.headers.Authorization = `Bearer ${newAccess}`
          return api(orig)
        } catch {
          localStorage.removeItem('auth')
        }
      }
    }
    return Promise.reject(err)
  },
)
