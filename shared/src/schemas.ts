import { z } from 'zod';

export const GAME_MODES = ['classic', 'hidden', 'speed', 'combination', 'teams'] as const;
export const WORD_DIFFICULTIES = ['mixed', 'easy', 'medium', 'hard'] as const;
export const TEAMS = ['red', 'blue'] as const;
export const LANGUAGES = ['english', 'spanish', 'french', 'german'] as const;
export const DRAW_TOOLS = ['pen', 'eraser', 'fill', 'line', 'rect', 'circle'] as const;

export const gameModeSchema = z.enum(GAME_MODES);
export const wordDifficultySchema = z.enum(WORD_DIFFICULTIES);
export const teamSchema = z.enum(TEAMS);
export const languageSchema = z.enum(LANGUAGES);
export const reactionSchema = z.enum(['like', 'dislike']);

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
  team: teamSchema.nullable(),
});

export const drawDataSchema = z.object({
  // 'shape' is a single event carrying both corners of a line, rectangle or ellipse
  type: z.enum(['start', 'move', 'end', 'shape']),
  x: z.number().finite(),
  y: z.number().finite(),
  x2: z.number().finite().optional(),
  y2: z.number().finite().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  size: z.number().min(1).max(64),
  tool: z.enum(DRAW_TOOLS),
});

export const chatMessageSchema = z.object({
  playerId: z.string(),
  username: z.string(),
  text: z.string(),
  isCorrect: z.boolean(),
  isSystem: z.boolean(),
  timestamp: z.number(),
  // 'close' marks private "you're close" notices shown only to the guesser
  kind: z.enum(['close']).optional(),
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
  language: languageSchema,
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
  mode: gameModeSchema,
  wordDifficulty: wordDifficultySchema,
  customWords: z.array(z.string()),
  customWordsOnly: z.boolean(),
  usedWords: z.array(z.string()),
  kickVotes: z.record(z.string(), z.array(z.string())),
  bannedIds: z.array(z.string()),
  afkStrikes: z.record(z.string(), z.number()),
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

// Settings the host can change from the lobby as well as at creation
const roomSettingsShape = {
  isPrivate: z.boolean().default(false),
  maxPlayers: z.number().int().min(2).max(12).default(8),
  rounds: z.number().int().min(1).max(10).default(3),
  drawTime: z.number().int().min(30).max(180).default(80),
  language: languageSchema.default('english'),
  mode: gameModeSchema.default('classic'),
  wordDifficulty: wordDifficultySchema.default('mixed'),
};

export const roomSettingsSchema = z.object(roomSettingsShape).superRefine((room, ctx) => {
  if (room.mode === 'teams' && room.maxPlayers < 4) {
    ctx.addIssue({ code: 'custom', path: ['maxPlayers'], message: 'Teams mode needs room for at least 4 players' });
  }
});

export const createRoomSchema = z.object({
  name: z.string().min(1).max(30),
  ...roomSettingsShape,
  guestUsername: z.string().min(1).max(20).optional(),
  customWords: z
    .array(
      z.string().trim().toLowerCase().min(1).max(30)
        .regex(/^[\p{L}\p{N} '-]+$/u, 'Custom words can only contain letters, numbers, spaces, hyphens and apostrophes'),
    )
    .max(500)
    .default([]),
  customWordsOnly: z.boolean().default(false),
}).superRefine((room, ctx) => {
  if (room.customWordsOnly && new Set(room.customWords).size < 3) {
    ctx.addIssue({ code: 'custom', path: ['customWords'], message: 'Add at least 3 custom words to use only custom words' });
  }
  if (room.mode === 'teams' && room.maxPlayers < 4) {
    ctx.addIssue({ code: 'custom', path: ['maxPlayers'], message: 'Teams mode needs room for at least 4 players' });
  }
});

// inferred ts types 

export type Player = z.infer<typeof playerSchema>;
export type DrawData = z.infer<typeof drawDataSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type RoomState = z.infer<typeof roomStateSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type RoomSettings = z.infer<typeof roomSettingsSchema>;
export type Language = z.infer<typeof languageSchema>;
export type DrawTool = z.infer<typeof drawDataSchema>['tool'];
export type GameMode = z.infer<typeof gameModeSchema>;
export type WordDifficulty = z.infer<typeof wordDifficultySchema>;
export type Team = z.infer<typeof teamSchema>;
export type Reaction = z.infer<typeof reactionSchema>;

// Speed rounds halve the configured draw time once the game starts
export function effectiveDrawTime(mode: GameMode, drawTime: number): number {
  return mode === 'speed' ? Math.max(20, Math.round(drawTime / 2)) : drawTime;
}
