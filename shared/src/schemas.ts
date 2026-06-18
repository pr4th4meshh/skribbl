import { z } from 'zod';

export const playerSchema = z.object({
  id: z.string(),
  socketId: z.string(),
  username: z.string(),
  avatar: z.string().nullable(),
  score: z.number(),
  hasGuessed: z.boolean(),
  isDrawing: z.boolean(),
  isHost: z.boolean(),
  isGuest: z.boolean(),
  connected: z.boolean(),
});

export const drawDataSchema = z.object({
  type: z.enum(['start', 'move', 'end']),
  x: z.number(),
  y: z.number(),
  color: z.string(),
  size: z.number(),
  tool: z.enum(['pen', 'eraser', 'fill']),
});

export const chatMessageSchema = z.object({
  playerId: z.string(),
  username: z.string(),
  text: z.string(),
  isCorrect: z.boolean(),
  isSystem: z.boolean(),
  timestamp: z.number(),
});

export const roomStateSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  hostId: z.string(),
  isPrivate: z.boolean(),
  maxPlayers: z.number(),
  totalRounds: z.number(),
  drawTime: z.number(),
  language: z.string(),
  status: z.enum(['WAITING', 'IN_PROGRESS', 'ENDED']),
  players: z.array(playerSchema),
  currentRound: z.number(),
  currentWord: z.string().optional(),
  currentWordHint: z.string(),
  wordChoices: z.array(z.string()).optional(),
  drawerIndex: z.number(),
  drawerOrder: z.array(z.string()),
  roundStartedAt: z.number(),
  revealedIndices: z.array(z.number()),
  gameId: z.string().nullable(),
});

// auth schemas

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// room form schemas 

export const createRoomSchema = z.object({
  name: z.string().min(1).max(30),
  isPrivate: z.boolean().default(false),
  maxPlayers: z.number().int().min(2).max(12).default(8),
  rounds: z.number().int().min(1).max(10).default(3),
  drawTime: z.number().int().min(30).max(180).default(80),
  language: z.enum(['english']).default('english'),
  guestUsername: z.string().min(1).max(20).optional(),
});

// inferred ts types 

export type Player = z.infer<typeof playerSchema>;
export type DrawData = z.infer<typeof drawDataSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type RoomState = z.infer<typeof roomStateSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
