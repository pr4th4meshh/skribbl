import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public override message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'SkribblAppError';
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.status).json({ success: false, error: err.message });
    return;
  }

  console.error('[Unhandled error]', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
}
