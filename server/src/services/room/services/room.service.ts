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

    const state: RoomState = {
      id: String(room.id),
      code,
      name: room.name,
      hostId,
      isPrivate: room.isPrivate,
      maxPlayers: room.maxPlayers,
      totalRounds: room.rounds,
      drawTime: room.drawTime,
      language: room.language,
      status: 'WAITING',
      players: [],
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

  async createGuestRoom(input: CreateRoomInput, hostUsername: string) {
    const code = await this.generateUniqueCode();

    const state: RoomState = {
      id: '',  // no DB record — guards in game service skip DB ops for guest rooms
      code,
      name: input.name,
      hostId: '',
      isPrivate: input.isPrivate,
      maxPlayers: input.maxPlayers,
      totalRounds: input.rounds,
      drawTime: input.drawTime,
      language: input.language,
      status: 'WAITING',
      players: [],
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
    return { code, roomId: '' };
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
