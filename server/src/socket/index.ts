import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redis, redisSub } from '../shared/config/redis';
import { env } from '../shared/config/env';
import { socketAuthMiddleware } from './middleware';
import { registerRoomHandlers } from './handlers/room.handler';
import { registerGameHandlers } from './handlers/game.handler';
import { registerChatHandlers } from './handlers/chat.handler';
import { createGameWorker } from '../services/game/queue/game.queue';
import { gameService } from '../services/game/services/game.service';
import type { AuthSocket } from './middleware';
import type { GameJobData } from '../services/game/queue/game.queue';
import type { Job } from 'bullmq';

export function initSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN, credentials: true },
    pingTimeout: 60_000,
    pingInterval: 25_000,
  });

  io.adapter(createAdapter(redis, redisSub));
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    const s = socket as AuthSocket;
    console.log(`[Socket] connected: ${s.id}`);
    registerRoomHandlers(io, s);
    registerGameHandlers(io, s);
    registerChatHandlers(io, s);
    s.on('error', (err) => console.error(`[Socket] error [${s.id}]:`, err));
  });

  const worker = createGameWorker(async (job: Job<GameJobData>) => {
    const { data } = job;
    if (data.type === 'auto-word') {
      await gameService.handleAutoWord(data.code, io);
    } else if (data.type === 'end-round') {
      await gameService.endRound(data.code, io);
    } else if (data.type === 'reveal') {
      await gameService.handleReveal(data.code, data.revealNum, io);
    }
  });

  worker.on('failed', (job, err) =>
    console.error(`[GameWorker] job ${job?.id} failed:`, err.message),
  );

  return io;
}
