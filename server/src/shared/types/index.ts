import type { Request } from 'express';

export type { Player, RoomState, ChatMessage, DrawData } from '@skribbl/shared';
export type { ServerToClientEvents, ClientToServerEvents } from '@skribbl/shared';

export interface AuthPayload {
  userId: string;
  username: string;
  email: string;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}
