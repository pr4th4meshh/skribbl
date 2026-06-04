import { v4 as uuid } from 'uuid';
import type { Server } from 'socket.io';
import { redis } from '../../shared/config/redis';
import { roomService } from '../../services/room/services/room.service';
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
    if (state.status === 'IN_PROGRESS') { socket.emit('error', { message: 'Game already in progress' }); return; }

    const isGuest = !socket.user;
    const playerId = socket.user?.userId ?? `guest_${uuid()}`;
    const username = socket.user?.username ?? data.username?.trim() ?? 'Guest';

    const existing = state.players.find((p) => p.id === playerId);
    if (existing) {
      // Same player re-connecting (e.g. React StrictMode double-mount race):
      // take over the slot rather than creating a duplicate entry.
      existing.socketId = socket.id;
      existing.connected = true;
    } else {
      if (state.players.length >= state.maxPlayers) { socket.emit('error', { message: 'Room is full' }); return; }
      state.players.push({
        id: playerId, socketId: socket.id, username, avatar: null,
        score: 0, hasGuessed: false, isDrawing: false,
        isHost: state.players.length === 0, isGuest, connected: true,
      });
    }

    await roomService.setRoomState(state);
    await redis.setex(SOCKET_ROOM_KEY(socket.id), 86400, code);
    await redis.setex(SOCKET_PID_KEY(socket.id), 86400, playerId);

    const messagesRaw = await redis.lrange(`messages:${code}`, 0, -1);
    const messages = messagesRaw.map((m) => JSON.parse(m));

    socket.join(code);
    socket.emit('room:joined', { code, playerId, state: sanitizeState(state, playerId), messages });
    socket.to(code).emit('room:updated', sanitizeState(state, ''));
  });

  socket.on('disconnect', async () => {
    const code = await redis.get(SOCKET_ROOM_KEY(socket.id));
    const playerId = await redis.get(SOCKET_PID_KEY(socket.id));
    await redis.del(SOCKET_ROOM_KEY(socket.id), SOCKET_PID_KEY(socket.id));
    if (!code || !playerId) return;

    const state = await roomService.getRoomState(code);
    if (!state) return;

    const playerIdx = state.players.findIndex((p) => p.id === playerId);
    if (playerIdx === -1) return;

    const player = state.players[playerIdx]!;
    // A newer socket already took over this player slot — don't evict them.
    if (player.socketId !== socket.id) return;

    // Transfer host before removing
    if (player.isHost) {
      const next = state.players.find((_, i) => i !== playerIdx);
      if (next) { next.isHost = true; state.hostId = next.id; }
    }

    state.players.splice(playerIdx, 1);

    if (state.players.length === 0) {
      await clearGameJobs(code);
      await roomService.setRoomState(state);
      return;
    }

    await roomService.setRoomState(state);
    io.to(code).emit('room:updated', sanitizeState(state, ''));
  });
}
