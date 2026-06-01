import type { Server } from 'socket.io';
import { redis } from '../../shared/config/redis';
import { roomService } from '../../services/room/services/room.service';
import { gameService } from '../../services/game/services/game.service';
import type { AuthSocket } from '../middleware';
import type { DrawData } from '../../shared/types';

const SOCKET_ROOM_KEY = (sid: string) => `socket:room:${sid}`;
const SOCKET_PID_KEY = (sid: string) => `socket:pid:${sid}`;

async function getContext(socketId: string) {
  const [code, playerId] = await redis.mget(SOCKET_ROOM_KEY(socketId), SOCKET_PID_KEY(socketId));
  if (!code || !playerId) return null;
  const state = await roomService.getRoomState(code);
  if (!state) return null;
  const player = state.players.find((p) => p.id === playerId);
  return { code, playerId, state, player };
}

export function registerGameHandlers(io: Server, socket: AuthSocket) {
  socket.on('game:start', async () => {
    const ctx = await getContext(socket.id);
    if (!ctx) return;
    if (!ctx.player?.isHost) { socket.emit('error', { message: 'Only the host can start the game' }); return; }
    const ok = await gameService.startGame(ctx.code, io);
    if (!ok) socket.emit('error', { message: 'Need at least 2 players to start' });
  });

  socket.on('game:select-word', async ({ word }: { word: string }) => {
    const ctx = await getContext(socket.id);
    if (!ctx || !ctx.player?.isDrawing) return;
    if (!ctx.state.wordChoices.includes(word)) return;
    await gameService.setWord(ctx.code, word, io);
  });

  socket.on('game:draw', async (data: DrawData) => {
    const ctx = await getContext(socket.id);
    if (!ctx || ctx.state.status !== 'IN_PROGRESS' || !ctx.player?.isDrawing) return;
    socket.to(ctx.code).emit('game:draw', data);
  });

  socket.on('game:clear', async () => {
    const ctx = await getContext(socket.id);
    if (!ctx || ctx.state.status !== 'IN_PROGRESS' || !ctx.player?.isDrawing) return;
    socket.to(ctx.code).emit('game:clear');
  });

  socket.on('game:guess', async ({ text }: { text: string }) => {
    if (!text?.trim()) return;
    const ctx = await getContext(socket.id);
    if (!ctx || ctx.state.status !== 'IN_PROGRESS' || !ctx.player) return;
    if (ctx.player.isDrawing || ctx.player.hasGuessed) return;

    const correct = await gameService.handleGuess(ctx.code, ctx.playerId, text, io);
    if (!correct) {
      io.to(ctx.code).emit('game:message', {
        playerId: ctx.playerId,
        username: ctx.player.username,
        text: text.trim(),
        isCorrect: false,
        isSystem: false,
        timestamp: Date.now(),
      });
    }
  });
}
