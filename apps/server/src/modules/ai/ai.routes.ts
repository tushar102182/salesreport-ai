import { Router } from 'express';
import { aiSettingsInputSchema } from '@salesreport/shared';
import { requireAuth, requireRole } from '../../middleware/auth';
import { aiLimiter } from '../../middleware/rateLimit';
import { validate } from '../../lib/validate';
import { getAuth } from '../../lib/http';
import * as ai from './aiSettings.service';

export const aiSettingsRouter = Router();
aiSettingsRouter.use(requireAuth, requireRole('admin'));

aiSettingsRouter.get('/', async (req, res) => {
  res.json(await ai.getAiSettings(getAuth(req).organizationId));
});
aiSettingsRouter.put('/', async (req, res) => {
  res.json(await ai.updateAiSettings(getAuth(req).organizationId, validate(aiSettingsInputSchema, req.body)));
});
aiSettingsRouter.delete('/key', async (req, res) => {
  res.json(await ai.deleteAiKey(getAuth(req).organizationId));
});
aiSettingsRouter.post('/test', aiLimiter, async (req, res) => {
  res.json(await ai.testAiConnection(getAuth(req).organizationId));
});
