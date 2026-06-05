import { useMutation, type UseMutationOptions } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import type { User, ApiResponse } from '@/types'

interface AuthResult {
  user: User
  accessToken: string
  refreshToken: string
}

type LoginVars = { email: string; password: string }

export function useLogin(options?: UseMutationOptions<AuthResult, Error, LoginVars>) {
  return useMutation<AuthResult, Error, LoginVars>({
    mutationFn: async ({ email, password }) => {
      const { data } = await api.post<ApiResponse<AuthResult>>('/auth/login', { email, password })
      return data.data
    },
    ...options,
  })
}
