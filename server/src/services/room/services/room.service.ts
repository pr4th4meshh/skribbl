import { roomDAO, type RoomDAO } from '../dao/room.dao';
import { AppError } from '../../../shared/middleware/error.middleware';
import type { CreateRoomInput } from '../router/room.schema';
import type { RoomState, Player } from '../../../shared/types';

export class RoomService {
  constructor(private readonly dao: RoomDAO) {}

  async getRoomState(code: string): Promise<RoomState | null> {
    return this.dao.getState(code);
  }

  async setRoomState(state: RoomState): Promise<void> {
    return this.dao.setState(state);
  }

  async deleteRoomState(code: string): Promise<void> {
    return this.dao.deleteState(code);
  }

  async createRoom(
    input: CreateRoomInput,
    hostId: string,
    hostUsername: string,
    hostAvatar: string | null,
  ) {
    const code = await this.generateUniqueCode();
    const room = await this.dao.create(input, hostId, code);

    const hostPlayer: Player = {
      id: hostId,
      socketId: '',
      username: hostUsername,
      avatar: hostAvatar,
      score: 0,
      hasGuessed: false,
      isDrawing: false,
      isHost: true,
      isGuest: false,
      connected: false,
    };

    const state: RoomState = {
      id: String(room.id), // int → string at app boundary
      code,
      name: room.name,
      hostId,
      isPrivate: room.isPrivate,
      maxPlayers: room.maxPlayers,
      totalRounds: room.rounds,
      drawTime: room.drawTime,
      language: room.language,
      status: 'WAITING',
      players: [hostPlayer],
      currentRound: 0,
      currentWord: '',
      currentWordHint: '',
      wordChoices: [],
      drawerIndex: -1,
      drawerOrder: [],
      roundStartedAt: 0,
      revealedIndices: [],
      gameId: null,
    };

    await this.dao.setState(state);
    return { code, roomId: String(room.id) };
  }

  async listPublicRooms() {
    return this.dao.listPublic();
  }

  private async generateUniqueCode(): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      if (!(await this.dao.codeExists(code))) return code;
    }
    throw new AppError('Could not generate unique room code', 500);
  }
}

export const roomService = new RoomService(roomDAO);
