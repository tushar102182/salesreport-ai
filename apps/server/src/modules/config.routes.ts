import { Router } from 'express';
import { APP_VERSION } from '@salesreport/shared';
import { env } from '../config/env';
import { DEMO_ADMIN } from '../demo/constants';
import { getFxTable } from '../lib/fx';

/** Public, non-sensitive client configuration. */
export const publicConfigRouter = Router();

publicConfigRouter.get('/', (_req, res) => {
  res.json({
    appName: 'SalesReport AI',
    version: APP_VERSION,
    allowRegistration: env.ALLOW_REGISTRATION,
    demoMode: env.DEMO_MODE,
    ...(env.DEMO_MODE ? { demoCredentials: { email: DEMO_ADMIN.email, password: DEMO_ADMIN.password } } : {}),
  });
});

/** Exchange rates (base USD) used to show amounts in the display currency. Approximate. */
publicConfigRouter.get('/fx', async (_req, res) => {
  const t = await getFxTable();
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json({ ...t, approximate: true });
});
