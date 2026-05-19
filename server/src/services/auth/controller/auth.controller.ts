import type { Request, Response, NextFunction } from 'express';
import { authService, type AuthService } from '../services/auth.service';
import { registerSchema, loginSchema, refreshSchema } from '../../../shared/schema/auth.schema';
import { success } from '../../../shared/utils/response';
import type { AuthRequest } from '../../../shared/types';

export class AuthController {
  constructor(private readonly service: AuthService) {}

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = registerSchema.parse(req.body);
      success(res, await this.service.register(input), 201);
    } catch (err) {
      next(err);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = loginSchema.parse(req.body);
      success(res, await this.service.login(input));
    } catch (err) {
      next(err);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = refreshSchema.parse(req.body);
      success(res, await this.service.refreshTokens(refreshToken));
    } catch (err) {
      next(err);
    }
  };

  me = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      success(res, await this.service.getProfile(req.user!.userId));
    } catch (err) {
      next(err);
    }
  };
}

export const authController = new AuthController(authService);
