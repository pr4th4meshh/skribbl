import { useMutation, type UseMutationOptions } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import type { User, ApiResponse } from '@/types'

interface AuthResult {
  user: User
  accessToken: string
  refreshToken: string
}

type RegisterVars = { username: string; email: string; password: string }

export function useRegister(options?: UseMutationOptions<AuthResult, Error, RegisterVars>) {
  return useMutation<AuthResult, Error, RegisterVars>({
    mutationFn: async ({ username, email, password }) => {
      const { data } = await api.post<ApiResponse<AuthResult>>('/auth/register', { username, email, password })
      return data.data
    },
    ...options,
  })
}
