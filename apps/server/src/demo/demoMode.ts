import { env } from '../config/env';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { seedDemo, wipeAll } from './seed';

let timer: NodeJS.Timeout | undefined;

function msUntilNextReset(now = new Date()): number {
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), env.DEMO_RESET_HOUR_UTC, 0, 0),
  );
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - now.getTime();
}

export async function resetDemo() {
  logger.warn('DEMO_MODE: wiping and re-seeding all data');
  await wipeAll(prisma);
  await seedDemo(prisma, { log: (m) => logger.info(m) });
}

/**
 * DEMO_MODE: seeds demo data on start (if missing) and wipes + re-seeds every day
 * at DEMO_RESET_HOUR_UTC. Never enable on a database with real data.
 */
export async function startDemoMode() {
  await seedDemo(prisma, { log: (m) => logger.info(m) });
  const schedule = () => {
    const ms = msUntilNextReset();
    logger.info({ inMinutes: Math.round(ms / 60_000) }, 'DEMO_MODE: next data reset scheduled');
    timer = setTimeout(() => {
      resetDemo()
        .catch((err) => logger.error({ err }, 'DEMO_MODE reset failed'))
        .finally(schedule);
    }, ms);
    timer.unref();
  };
  schedule();
}
