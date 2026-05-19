import { prisma } from '../../../shared/prisma/client';

export class AuthDAO {
  async findByEmailOrUsername(email: string, username: string) {
    return prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
      select: { id: true },
    });
  }

  async create(data: { username: string; email: string; password: string }) {
    return prisma.user.create({
      data,
      select: { id: true, username: true, email: true, avatar: true },
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      select: { id: true, username: true, email: true, password: true, avatar: true },
    });
  }

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id: parseInt(id, 10) },
      select: { id: true, username: true, email: true },
    });
  }

  async getProfile(id: string) {
    return prisma.user.findUnique({
      where: { id: parseInt(id, 10) },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        totalScore: true,
        gamesPlayed: true,
        wins: true,
        createdAt: true,
      },
    });
  }
}

export const authDAO = new AuthDAO();
