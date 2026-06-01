import { Redis } from 'ioredis';
import { env } from './env';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

export const redisSub = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('error', (err) => console.error('[Redis]', err.message));
redisSub.on('error', (err) => console.error('[Redis sub]', err.message));

export async function connectRedis() {
  if (redis.status === 'wait') await redis.connect();
  if (redisSub.status === 'wait') await redisSub.connect();
  await redis.ping();
  await redisSub.ping();
  console.log('[Redis] connected');
}
