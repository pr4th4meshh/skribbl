import { prisma } from '../../../shared/prisma/client';

export class LeaderboardDAO {
  async getTopPlayers(limit = 50) {
    return prisma.user.findMany({
      orderBy: { totalScore: 'desc' },
      take: limit,
      select: {
        id: true,
        username: true,
        avatar: true,
        totalScore: true,
        gamesPlayed: true,
        wins: true,
      },
    });
  }
}

export const leaderboardDAO = new LeaderboardDAO();
