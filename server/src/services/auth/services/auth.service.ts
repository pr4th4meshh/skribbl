import argon2 from 'argon2';
import { authDAO, type AuthDAO } from '../dao/auth.dao';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../../shared/utils/jwt';
import { AppError } from '../../../shared/middleware/error.middleware';
import type { RegisterInput, LoginInput } from '../../../shared/schema/auth.schema';

export class AuthService {
  constructor(private readonly dao: AuthDAO) {}

  async register(input: RegisterInput) {
    const existing = await this.dao.findByEmailOrUsername(input.email, input.username);
    if (existing) throw new AppError('Email or username already taken', 409);

    const password = await argon2.hash(input.password);
    const user = await this.dao.create({ username: input.username, email: input.email, password });

    // DB returns id: number — stringify for JWT and consistent app-layer types
    const userId = String(user.id);
    const payload = { userId, username: user.username, email: user.email };
    return {
      user: { ...user, id: userId },
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken({ userId }),
    };
  }

  async login(input: LoginInput) {
    const user = await this.dao.findByEmail(input.email);
    if (!user) throw new AppError('Invalid credentials', 401);

    const valid = await argon2.verify(user.password, input.password);
    if (!valid) throw new AppError('Invalid credentials', 401);

    const userId = String(user.id);
    const payload = { userId, username: user.username, email: user.email };
    return {
      user: { id: userId, username: user.username, email: user.email, avatar: user.avatar },
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken({ userId }),
    };
  }

  async refreshTokens(token: string) {
    let userId: string;
    try {
      ({ userId } = verifyRefreshToken(token));
    } catch {
      throw new AppError('Invalid refresh token', 401);
    }

    const user = await this.dao.findById(userId);
    if (!user) throw new AppError('User not found', 401);

    const freshUserId = String(user.id);
    const payload = { userId: freshUserId, username: user.username, email: user.email };
    return {
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken({ userId: freshUserId }),
    };
  }

  async getProfile(userId: string) {
    return this.dao.getProfile(userId);
  }
}

export const authService = new AuthService(authDAO);
