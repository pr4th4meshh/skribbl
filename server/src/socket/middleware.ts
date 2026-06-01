import type { Socket } from 'socket.io';
import { verifyAccessToken } from '../shared/utils/jwt';
import type { AuthPayload } from '../shared/types';

export interface AuthSocket extends Socket {
  user?: AuthPayload;
}

export function socketAuthMiddleware(socket: AuthSocket, next: (err?: Error) => void) {
  const token = socket.handshake.auth?.['token'] as string | undefined;
  if (!token) { next(); return; }
  try {
    socket.user = verifyAccessToken(token);
    next();
  } catch {
    next(new Error('Invalid token'));
  }
}
