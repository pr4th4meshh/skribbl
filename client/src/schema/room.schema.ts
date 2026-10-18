import { z } from 'zod'
import { GAME_MODES, WORD_DIFFICULTIES } from '@skribbl/shared'

export const joinRoomSchema = z.object({
  code: z.string().min(4).max(10),
})

export const createRoomSchema = z.object({
  name: z.string().min(1).max(30),
  isPrivate: z.boolean(),
  maxPlayers: z.number().int().min(2).max(12),
  rounds: z.number().int().min(1).max(10),
  drawTime: z.number().int().min(30).max(180),
  mode: z.enum(GAME_MODES),
  wordDifficulty: z.enum(WORD_DIFFICULTIES),
  // Raw textarea input — split into a list on submit
  customWords: z.string().max(10_000),
  customWordsOnly: z.boolean(),
}).superRefine((room, ctx) => {
  if (room.customWordsOnly && parseCustomWords(room.customWords).length < 3) {
    ctx.addIssue({ code: 'custom', path: ['customWords'], message: 'Add at least 3 custom words to use only custom words' })
  }
  if (room.mode === 'teams' && room.maxPlayers < 4) {
    ctx.addIssue({ code: 'custom', path: ['maxPlayers'], message: 'Teams mode needs at least 4 players' })
  }
})

export function parseCustomWords(raw: string): string[] {
  const words = raw.split(/[,\n]/).map((w) => w.trim().toLowerCase()).filter(Boolean)
  return [...new Set(words)]
}

export type JoinRoomForm = z.infer<typeof joinRoomSchema>
export type CreateRoomForm = z.infer<typeof createRoomSchema>
