import { z } from 'zod'

export const joinRoomSchema = z.object({
  code: z.string().min(4).max(10),
})

export const createRoomSchema = z.object({
  name: z.string().min(1).max(30),
  isPrivate: z.boolean(),
  maxPlayers: z.number().int().min(2).max(12),
  rounds: z.number().int().min(1).max(10),
  drawTime: z.number().int().min(30).max(180),
})

export type JoinRoomForm = z.infer<typeof joinRoomSchema>
export type CreateRoomForm = z.infer<typeof createRoomSchema>
