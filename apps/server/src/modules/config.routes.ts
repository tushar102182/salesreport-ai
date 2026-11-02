import { Router } from 'express';
import { env } from '../config/env';
import { DEMO_ADMIN } from '../demo/constants';

/** Public, non-sensitive client configuration. */
export const publicConfigRouter = Router();

publicConfigRouter.get('/', (_req, res) => {
  res.json({
    appName: 'SalesReport AI',
    allowRegistration: env.ALLOW_REGISTRATION,
    demoMode: env.DEMO_MODE,
    ...(env.DEMO_MODE ? { demoCredentials: { email: DEMO_ADMIN.email, password: DEMO_ADMIN.password } } : {}),
  });
});
