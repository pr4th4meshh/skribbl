import type { Server } from 'socket.io';
import { redis } from '../../shared/config/redis';
import { roomService } from '../../services/room/services/room.service';
import { SOCKET_ROOM_KEY, SOCKET_PID_KEY } from '../../shared/utils/socketKeys';
import type { AuthSocket } from '../middleware';

export function registerChatHandlers(io: Server, socket: AuthSocket) {
  socket.on('chat:message', async ({ text }: { text: string }) => {
    if (!text?.trim() || text.length > 200) return;

    const [code, playerId] = await redis.mget(SOCKET_ROOM_KEY(socket.id), SOCKET_PID_KEY(socket.id));
    if (!code || !playerId) return;

    const state = await roomService.getRoomState(code);
    if (!state) return;

    const player = state.players.find((p) => p.id === playerId);
    if (!player) return;

    if (state.status === 'IN_PROGRESS' && state.currentWord) return;

    const msg = { playerId: player.id, username: player.username, text: text.trim(), isCorrect: false, isSystem: false, timestamp: Date.now() };
    await redis.rpush(`messages:${code}`, JSON.stringify(msg));
    await redis.ltrim(`messages:${code}`, -200, -1);
    await redis.expire(`messages:${code}`, 86400);
    io.to(code).emit('game:message', msg);
  });
}
