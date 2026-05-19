import type { Request } from 'express';

export interface AuthPayload {
  userId: string;
  username: string;
  email: string;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export interface Player {
  id: string;
  socketId: string;
  username: string;
  avatar: string | null;
  score: number;
  hasGuessed: boolean;
  isDrawing: boolean;
  isHost: boolean;
  isGuest: boolean;
  connected: boolean;
}

export interface RoomState {
  id: string;
  code: string;
  name: string;
  hostId: string;
  isPrivate: boolean;
  maxPlayers: number;
  totalRounds: number;
  drawTime: number;
  language: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'ENDED';
  players: Player[];
  currentRound: number;
  currentWord: string;
  currentWordHint: string;
  wordChoices: string[];
  drawerIndex: number;
  drawerOrder: string[];
  roundStartedAt: number;
  revealedIndices: number[];
  gameId: string | null;
}

export interface DrawData {
  type: 'start' | 'move' | 'end';
  x: number;
  y: number;
  color: string;
  size: number;
  tool: 'pen' | 'eraser';
}
