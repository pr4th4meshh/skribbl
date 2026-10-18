import type { Server } from 'socket.io';
import { redis } from '../../shared/config/redis';
import { roomService } from '../../services/room/services/room.service';
import { gameService } from '../../services/game/services/game.service';
import type { AuthSocket } from '../middleware';
import { SOCKET_ROOM_KEY, SOCKET_PID_KEY } from '../../shared/utils/socketKeys';
import type { DrawData, Reaction } from '../../shared/types';

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
    try {
      const ctx = await getContext(socket.id);
      if (!ctx) { console.error('[game:start] no context for socket', socket.id); return; }
      if (!ctx.player?.isHost) { socket.emit('error', { message: 'Only the host can start the game' }); return; }
      console.log('[game:start] starting game for room', ctx.code, 'players:', ctx.state.players.length);
      const startError = await gameService.startGame(ctx.code, io);
      // Not fatal — send as a chat notice so the host stays in the lobby
      if (startError) socket.emit('game:notice', { message: startError });
    } catch (err) {
      console.error('[game:start] error:', err);
      socket.emit('error', { message: 'Failed to start game' });
    }
  });

  socket.on('game:select-word', async ({ word }: { word: string }) => {
    try {
      const ctx = await getContext(socket.id);
      if (!ctx) { console.error('[game:select-word] no context for socket', socket.id); return; }
      if (!ctx.player?.isDrawing) { console.warn('[game:select-word] player is not drawer', ctx.playerId); return; }
      if (!ctx.state.wordChoices?.includes(word)) { console.warn('[game:select-word] word not in choices', word, ctx.state.wordChoices); return; }
      await gameService.setWord(ctx.code, word, io);
    } catch (err) {
      console.error('[game:select-word] error:', err);
    }
  });

  socket.on('game:draw', async (data: DrawData) => {
    const ctx = await getContext(socket.id);
    if (!ctx || ctx.state.status !== 'IN_PROGRESS' || !ctx.player?.isDrawing) return;
    if (data.type === 'start') await gameService.markDrawn(ctx.code);
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

    const result = await gameService.handleGuess(ctx.code, ctx.playerId, text, io);
    if (result === 'close') {
      socket.emit('game:notice', { message: `'${text.trim()}' is close!` });
    } else if (result === 'partial') {
      socket.emit('game:notice', { message: `'${text.trim()}' is one of the two words — keep going!` });
    } else if (result === 'blocked') {
      socket.emit('game:notice', { message: "It's the other team's turn — no spoilers!" });
    } else if (result === 'wrong') {
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

  socket.on('game:react', async ({ reaction }: { reaction: Reaction }) => {
    if (reaction !== 'like' && reaction !== 'dislike') return;
    try {
      const ctx = await getContext(socket.id);
      if (!ctx) return;
      await gameService.react(ctx.code, ctx.playerId, reaction, io);
    } catch (err) {
      console.error('[game:react] error:', err);
    }
  });
}
