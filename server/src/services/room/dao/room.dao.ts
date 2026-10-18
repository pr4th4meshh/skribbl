import { prisma } from '../../../shared/prisma/client';
import { redis } from '../../../shared/config/redis';
import type { RoomState, RoomSettings } from '../../../shared/types';
import type { CreateRoomInput } from '../router/room.schema';

const ROOM_TTL_SEC = 60 * 60 * 24;
// Codes of public rooms (guest rooms included) for quick play; pruned lazily
const PUBLIC_ROOMS_KEY = 'rooms:public';

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

  async getStates(codes: string[]): Promise<(RoomState | null)[]> {
    if (!codes.length) return [];
    const data = await redis.mget(codes.map((c) => `room:${c}`));
    return data.map((d) => (d ? (JSON.parse(d) as RoomState) : null));
  }

  async setPublic(code: string, isPublic: boolean): Promise<void> {
    if (isPublic) await redis.sadd(PUBLIC_ROOMS_KEY, code);
    else await redis.srem(PUBLIC_ROOMS_KEY, code);
  }

  async listPublicCodes(): Promise<string[]> {
    return redis.smembers(PUBLIC_ROOMS_KEY);
  }

  async removePublic(codes: string[]): Promise<void> {
    if (codes.length) await redis.srem(PUBLIC_ROOMS_KEY, ...codes);
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

  async updateSettings(id: string, settings: RoomSettings) {
    return prisma.room.update({
      where: { id: parseInt(id, 10) },
      data: {
        isPrivate: settings.isPrivate,
        maxPlayers: settings.maxPlayers,
        rounds: settings.rounds,
        drawTime: settings.drawTime,
        language: settings.language,
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
