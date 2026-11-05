import { Router } from 'express';
import { APP_VERSION } from '@salesreport/shared';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';

export const healthRouter = Router();
const startedAt = Date.now();

/** Liveness + readiness. Returns 503 when the database is unreachable. */
healthRouter.get('/', async (_req, res) => {
  let db: 'ok' | 'error' = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = 'error';
  }
  res.status(db === 'ok' ? 200 : 503).json({
    status: db === 'ok' ? 'ok' : 'degraded',
    db,
    version: APP_VERSION,
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    demoMode: env.DEMO_MODE,
    time: new Date().toISOString(),
  });
});
