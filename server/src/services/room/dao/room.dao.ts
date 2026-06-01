import { prisma } from '../../../shared/prisma/client';
import { redis } from '../../../shared/config/redis';
import type { RoomState } from '../../../shared/types';
import type { CreateRoomInput } from '../router/room.schema';

const ROOM_TTL_SEC = 60 * 60 * 24;

export class RoomDAO {
  // ── Redis ──────────────────────────────────────────────────────────

  async getState(code: string): Promise<RoomState | null> {
    const data = await redis.get(`room:${code}`);
    return data ? (JSON.parse(data) as RoomState) : null;
  }

  async setState(state: RoomState): Promise<void> {
    await redis.setex(`room:${state.code}`, ROOM_TTL_SEC, JSON.stringify(state));
  }

  async deleteState(code: string): Promise<void> {
    await redis.del(`room:${code}`);
  }

  async codeExists(code: string): Promise<boolean> {
    return (await redis.exists(`room:${code}`)) === 1;
  }

  // ── Prisma ─────────────────────────────────────────────────────────

  async create(input: CreateRoomInput, hostId: string, code: string) {
    return prisma.room.create({
      data: {
        code,
        name: input.name,
        hostId: parseInt(hostId, 10), // string → int at DB boundary
        isPrivate: input.isPrivate,
        maxPlayers: input.maxPlayers,
        rounds: input.rounds,
        drawTime: input.drawTime,
        language: input.language,
      },
    });
  }

  async updateStatus(code: string, status: 'WAITING' | 'IN_PROGRESS' | 'ENDED') {
    return prisma.room.update({ where: { code }, data: { status } });
  }

  async updateStatusById(id: string, status: 'WAITING' | 'IN_PROGRESS' | 'ENDED') {
    return prisma.room.update({ where: { id: parseInt(id, 10) }, data: { status } });
  }

  async listPublic() {
    return prisma.room.findMany({
      where: { isPrivate: false, status: 'WAITING' },
      include: { host: { select: { username: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}

export const roomDAO = new RoomDAO();
