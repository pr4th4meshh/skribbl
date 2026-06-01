import { z } from 'zod';

export const createRoomSchema = z.object({
  name: z.string().min(1).max(30),
  isPrivate: z.boolean().default(false),
  maxPlayers: z.number().int().min(2).max(12).default(8),
  rounds: z.number().int().min(1).max(10).default(3),
  drawTime: z.number().int().min(30).max(180).default(80),
  language: z.enum(['english']).default('english'),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
