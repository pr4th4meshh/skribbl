import type { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { failure } from '../utils/response';
import type { AuthRequest } from '../types';

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) { failure(res, 'Unauthorized', 401); return; }
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    failure(res, 'Invalid or expired token', 401);
  }
}

// Attaches user to request if a valid token is present; never blocks unauthenticated requests.
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    try { req.user = verifyAccessToken(token); } catch { /* guest — ignore */ }
  }
  next();
}

function extractToken(req: AuthRequest): string | null {
  const header = req.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice(7) : null;
}
