import 'dotenv/config';
import http from 'http';
import app from './app';
import { env } from './shared/config/env';
import { prisma } from './shared/prisma/client';
import { connectRedis } from './shared/config/redis';
import { initSocket } from './socket';

const httpServer = http.createServer(app);

initSocket(httpServer);

async function start() {
  try {
    await connectRedis();
    await prisma.$connect();
    httpServer.listen(env.PORT, () => {
      console.log(`[Server] running on port ${env.PORT} [${env.NODE_ENV}]`);
    });
  } catch (err) {
    console.error('[Server] startup failed:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  httpServer.close();
  process.exit(0);
});

start();
