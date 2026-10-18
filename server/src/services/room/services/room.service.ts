import { roomDAO, type RoomDAO } from '../dao/room.dao';
import { AppError } from '../../../shared/middleware/error.middleware';
import type { CreateRoomInput } from '../router/room.schema';
import type { RoomState, RoomSettings } from '../../../shared/types';

// Strip anything that would reveal the word to players who shouldn't see it
export function sanitizeState(state: RoomState, forPlayerId: string): RoomState {
  const drawer = state.players.find((p) => p.isDrawing);
  const isDrawer = drawer?.id === forPlayerId;
  return {
    ...state,
    currentWord: isDrawer || state.status !== 'IN_PROGRESS' ? state.currentWord : undefined,
    wordChoices: isDrawer ? state.wordChoices : undefined,
    customWords: [],
    usedWords: [],
  };
}

function gameSettings(input: CreateRoomInput) {
  return {
    // Stored as configured; speed mode halves it when the game starts
    drawTime: input.drawTime,
    mode: input.mode,
    wordDifficulty: input.wordDifficulty,
    customWords: [...new Set(input.customWords)],
    customWordsOnly: input.customWordsOnly,
    usedWords: [],
    kickVotes: {},
    bannedIds: [],
    afkStrikes: {},
  };
}

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
      ...gameSettings(input),
    };

    await this.dao.setState(state);
    await this.dao.setPublic(code, !state.isPrivate);
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
      ...gameSettings(input),
    };

    await this.dao.setState(state);
    await this.dao.setPublic(code, !state.isPrivate);
    return { code, roomId: '' };
  }

  async listPublicRooms() {
    return this.dao.listPublic();
  }

  /** Returns the updated state, or an error message. */
  async updateSettings(code: string, settings: RoomSettings): Promise<RoomState | string> {
    const state = await this.dao.getState(code);
    if (!state || state.status !== 'WAITING') return 'Settings can only be changed before the game starts';
    if (settings.maxPlayers < state.players.length) {
      return `Max players can't be lower than the ${state.players.length} players already here`;
    }

    state.isPrivate = settings.isPrivate;
    state.maxPlayers = settings.maxPlayers;
    state.totalRounds = settings.rounds;
    state.drawTime = settings.drawTime;
    state.language = settings.language;
    state.mode = settings.mode;
    state.wordDifficulty = settings.wordDifficulty;

    await this.dao.setState(state);
    await this.dao.setPublic(code, !state.isPrivate);
    if (state.id) await this.dao.updateSettings(state.id, settings);
    return state;
  }

  /** Picks the fullest open public room the player can join, pruning dead entries from the index. */
  async quickPlay(playerId?: string): Promise<string | null> {
    const codes = await this.dao.listPublicCodes();
    const states = await this.dao.getStates(codes);

    const stale = codes.filter((_, i) => !states[i] || states[i]!.status === 'ENDED' || states[i]!.isPrivate);
    if (stale.length) await this.dao.removePublic(stale);

    const open = states
      .filter((s): s is RoomState => !!s && s.status === 'WAITING' && !s.isPrivate)
      // An empty room has no host to start it
      .filter((s) => s.players.length > 0 && s.players.length < s.maxPlayers)
      .filter((s) => !playerId || (!s.bannedIds?.includes(playerId) && !s.players.some((p) => p.id === playerId)))
      .sort((a, b) => b.players.length - a.players.length);
    return open[0]?.code ?? null;
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
