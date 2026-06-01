import { prisma } from '../../../shared/prisma/client';
import type { RoomState } from '../../../shared/types';

export class GameDAO {
  async createGame(roomId: string) {
    return prisma.game.create({ data: { roomId: parseInt(roomId, 10) } });
  }

  async endGame(gameId: string) {
    return prisma.game.update({
      where: { id: parseInt(gameId, 10) },
      data: { status: 'ENDED', endedAt: new Date() },
    });
  }

  async persistScores(state: RoomState, winnerId: string) {
    if (!state.gameId) return;

    const gameIdInt = parseInt(state.gameId, 10);

    const scoreWrites = state.players
      .filter((p) => !p.isGuest)
      .map((p) =>
        prisma.gameScore.upsert({
          where: { gameId_userId: { gameId: gameIdInt, userId: parseInt(p.id, 10) } },
          create: { gameId: gameIdInt, userId: parseInt(p.id, 10), score: p.score },
          update: { score: p.score },
        }),
      );

    const userWrites = state.players
      .filter((p) => !p.isGuest)
      .map((p) =>
        prisma.user.update({
          where: { id: parseInt(p.id, 10) },
          data: {
            totalScore: { increment: p.score },
            gamesPlayed: { increment: 1 },
            ...(p.id === winnerId ? { wins: { increment: 1 } } : {}),
          },
        }),
      );

    await prisma.$transaction([...scoreWrites, ...userWrites]);
  }
}

export const gameDAO = new GameDAO();
