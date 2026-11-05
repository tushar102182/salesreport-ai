import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireCsrf } from '../../middleware/csrf';
import { authLimiter, refreshLimiter } from '../../middleware/rateLimit';
import * as c from './auth.controller';

export const authRouter = Router();

authRouter.get('/csrf', c.csrf);
authRouter.post('/register', authLimiter, c.register);
authRouter.post('/login', authLimiter, c.login);
authRouter.post('/refresh', refreshLimiter, requireCsrf, c.refresh);
authRouter.post('/logout', requireCsrf, c.logout);
authRouter.get('/me', requireAuth, c.me);
authRouter.patch('/me/preferences', requireAuth, c.updatePreferences);
authRouter.post('/change-password', authLimiter, requireAuth, c.changePassword);
