import { v4 as uuid } from 'uuid';
import type { Server } from 'socket.io';
import { redis } from '../../shared/config/redis';
import { roomService } from '../../services/room/services/room.service';
import { gameService } from '../../services/game/services/game.service';
import { clearGameJobs } from '../../services/game/queue/game.queue';
import type { AuthSocket } from '../middleware';
import type { Player, RoomState } from '../../shared/types';

const SOCKET_ROOM_KEY = (sid: string) => `socket:room:${sid}`;
const SOCKET_PID_KEY = (sid: string) => `socket:pid:${sid}`;

export function sanitizeState(state: RoomState, forPlayerId: string) {
  const drawer = state.players.find((p) => p.isDrawing);
  const isDrawer = drawer?.id === forPlayerId;
  return {
    ...state,
    currentWord: isDrawer || state.status !== 'IN_PROGRESS' ? state.currentWord : undefined,
    wordChoices: isDrawer ? state.wordChoices : undefined,
  };
}

export function registerRoomHandlers(io: Server, socket: AuthSocket) {
  socket.on('room:join', async (data: { roomCode: string; username?: string }) => {
    const code = data.roomCode?.toUpperCase();
    if (!code) { socket.emit('error', { message: 'Room code required' }); return; }

    const state = await roomService.getRoomState(code);
    if (!state) { socket.emit('error', { message: 'Room not found' }); return; }
    if (state.status === 'ENDED') { socket.emit('error', { message: 'Room has ended' }); return; }

    const isGuest = !socket.user;
    const playerId = socket.user?.userId ?? `guest_${uuid()}`;
    const username = socket.user?.username ?? data.username?.trim() ?? 'Guest';

    const existing = state.players.find((p) => p.id === playerId);
    if (existing) {
      existing.socketId = socket.id;
      existing.connected = true;
    } else {
      if (state.status === 'IN_PROGRESS') { socket.emit('error', { message: 'Game already in progress' }); return; }
      const connectedCount = state.players.filter((p) => p.connected).length;
      if (connectedCount >= state.maxPlayers) { socket.emit('error', { message: 'Room is full' }); return; }

      const player: Player = {
        id: playerId, socketId: socket.id, username, avatar: null,
        score: 0, hasGuessed: false, isDrawing: false,
        isHost: state.players.length === 0, isGuest, connected: true,
      };
      state.players.push(player);
    }

    await roomService.setRoomState(state);
    await redis.setex(SOCKET_ROOM_KEY(socket.id), 86400, code);
    await redis.setex(SOCKET_PID_KEY(socket.id), 86400, playerId);

    socket.join(code);
    socket.emit('room:joined', { code, playerId, state: sanitizeState(state, playerId) });
    socket.to(code).emit('room:updated', sanitizeState(state, ''));
  });

  socket.on('disconnect', async () => {
    const code = await redis.get(SOCKET_ROOM_KEY(socket.id));
    const playerId = await redis.get(SOCKET_PID_KEY(socket.id));
    await redis.del(SOCKET_ROOM_KEY(socket.id), SOCKET_PID_KEY(socket.id));
    if (!code || !playerId) return;

    const state = await roomService.getRoomState(code);
    if (!state) return;

    const player = state.players.find((p) => p.id === playerId);
    if (!player) return;

    player.connected = false;
    player.socketId = '';

    if (player.isDrawing && state.status === 'IN_PROGRESS') {
      await clearGameJobs(code);
      await roomService.setRoomState(state);
      await gameService.endRound(code, io);
      return;
    }

    if (player.isHost) {
      const next = state.players.find((p) => p.connected && p.id !== playerId);
      if (next) { player.isHost = false; next.isHost = true; state.hostId = next.id; }
    }

    const anyConnected = state.players.some((p) => p.connected);
    if (!anyConnected) {
      await clearGameJobs(code);
      await roomService.deleteRoomState(code);
      return;
    }

    await roomService.setRoomState(state);
    io.to(code).emit('room:updated', sanitizeState(state, ''));
  });
}
