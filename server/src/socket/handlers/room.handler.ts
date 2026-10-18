import { v4 as uuid } from 'uuid';
import type { Server } from 'socket.io';
import { roomSettingsSchema } from '@skribbl/shared';
import { redis } from '../../shared/config/redis';
import { roomService, sanitizeState } from '../../services/room/services/room.service';
import { gameService } from '../../services/game/services/game.service';
import { SOCKET_ROOM_KEY, SOCKET_PID_KEY } from '../../shared/utils/socketKeys';
import type { AuthSocket } from '../middleware';

async function getContext(socketId: string) {
  const [code, playerId] = await redis.mget(SOCKET_ROOM_KEY(socketId), SOCKET_PID_KEY(socketId));
  if (!code || !playerId) return null;
  const state = await roomService.getRoomState(code);
  if (!state) return null;
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return null;
  return { code, playerId, state, player };
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

    if (state.bannedIds?.includes(playerId)) { socket.emit('error', { message: 'You were kicked from this room' }); return; }

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
        isHost: state.players.length === 0, isGuest, connected: true, team: null,
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

  socket.on('room:kick', async ({ playerId: targetId }: { playerId: string }) => {
    try {
      const ctx = await getContext(socket.id);
      if (!ctx || !targetId) return;
      if (!ctx.player.isHost) { socket.emit('error', { message: 'Only the host can kick players' }); return; }
      if (targetId === ctx.playerId) return;
      const target = ctx.state.players.find((p) => p.id === targetId);
      if (!target) return;
      await gameService.kickPlayer(ctx.code, targetId, io, {
        reason: 'You were kicked by the host',
        announcement: `${target.username} was kicked by the host`,
        ban: true,
      });
    } catch (err) {
      console.error('[room:kick] error:', err);
    }
  });

  socket.on('room:vote-kick', async ({ playerId: targetId }: { playerId: string }) => {
    try {
      const ctx = await getContext(socket.id);
      if (!ctx || !targetId) return;
      await gameService.voteKick(ctx.code, ctx.playerId, targetId, io);
    } catch (err) {
      console.error('[room:vote-kick] error:', err);
    }
  });

  socket.on('room:update-settings', async (raw) => {
    try {
      const ctx = await getContext(socket.id);
      if (!ctx) return;
      // Notices rather than 'error': the client treats 'error' as fatal and leaves the room
      if (!ctx.player.isHost) { socket.emit('game:notice', { message: 'Only the host can change settings' }); return; }
      const parsed = roomSettingsSchema.safeParse(raw);
      if (!parsed.success) {
        socket.emit('game:notice', { message: parsed.error.issues[0]?.message ?? 'Invalid settings' });
        return;
      }
      const state = await roomService.updateSettings(ctx.code, parsed.data);
      if (typeof state === 'string') { socket.emit('game:notice', { message: state }); return; }
      io.to(ctx.code).emit('room:updated', sanitizeState(state, ''));
    } catch (err) {
      console.error('[room:update-settings] error:', err);
    }
  });

  socket.on('disconnect', async () => {
    const [code, playerId] = await redis.mget(SOCKET_ROOM_KEY(socket.id), SOCKET_PID_KEY(socket.id));
    await redis.del(SOCKET_ROOM_KEY(socket.id), SOCKET_PID_KEY(socket.id));
    if (!code || !playerId) return;

    const state = await roomService.getRoomState(code);
    const player = state?.players.find((p) => p.id === playerId);
    // A newer socket already took over this player slot — don't evict them.
    if (!player || player.socketId !== socket.id) return;

    try {
      await gameService.removePlayer(code, playerId, io);
    } catch (err) {
      console.error('[disconnect] error:', err);
    }
  });
}
