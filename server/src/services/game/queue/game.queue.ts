import { Queue, Worker, type Job } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '../../../shared/config/env';

export type GameJobData =
  | { type: 'auto-word'; code: string; words: string[] }
  | { type: 'end-round'; code: string }
  | { type: 'reveal'; code: string; revealNum: number; maxReveals: number };

// BullMQ requires maxRetriesPerRequest: null — separate connection from main redis client
const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null, enableOfflineQueue: false });

export const gameQueue = new Queue<GameJobData>('game', { connection });

export async function scheduleAutoWord(code: string, words: string[]) {
  await gameQueue.add('auto-word', { type: 'auto-word', code, words }, {
    delay: 10_000,
    jobId: `autoword-${code}`,
    removeOnComplete: true,
    removeOnFail: true,
  });
}

export async function scheduleEndRound(code: string, drawTimeMs: number) {
  await gameQueue.add('end-round', { type: 'end-round', code }, {
    delay: drawTimeMs,
    jobId: `endround-${code}`,
    removeOnComplete: true,
    removeOnFail: true,
  });
}

export async function scheduleReveal(code: string, revealNum: number, delayMs: number) {
  await gameQueue.add('reveal', { type: 'reveal', code, revealNum, maxReveals: 0 }, {
    delay: delayMs,
    jobId: `reveal-${code}-${revealNum}`,
    removeOnComplete: true,
    removeOnFail: true,
  });
}

export async function clearGameJobs(code: string): Promise<void> {
  const ids = [
    `autoword-${code}`,
    `endround-${code}`,
    ...Array.from({ length: 5 }, (_, i) => `reveal-${code}-${i + 1}`),
  ];
  await Promise.allSettled(
    ids.map(async (id) => {
      const job = await gameQueue.getJob(id);
      if (job) await job.remove();
    }),
  );
}

export function createGameWorker(processor: (job: Job<GameJobData>) => Promise<void>) {
  const workerConn = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null, enableOfflineQueue: false });
  return new Worker<GameJobData>('game', processor, { connection: workerConn });
}
