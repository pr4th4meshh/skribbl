import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const registerSchema = z.object({
  username: z.string().min(2).max(20).regex(/^\w+$/, 'Letters, numbers and _ only'),
  email: z.string().email(),
  password: z.string().min(6),
})

export type LoginForm = z.infer<typeof loginSchema>
export type RegisterForm = z.infer<typeof registerSchema>
