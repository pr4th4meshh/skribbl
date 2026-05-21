import rateLimit from 'express-rate-limit';

const rateLimitResponse = { success: false, error: 'Too many requests, please try again later' };

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: rateLimitResponse,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: rateLimitResponse,
  standardHeaders: true,
  legacyHeaders: false,
});
