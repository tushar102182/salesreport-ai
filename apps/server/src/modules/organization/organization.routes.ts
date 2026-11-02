import { Router } from 'express';
import { organizationInputSchema } from '@salesreport/shared';
import { requireAuth, requireRole } from '../../middleware/auth';
import { detectImageMime, logoUpload } from '../../middleware/upload';
import { validate } from '../../lib/validate';
import { getAuth } from '../../lib/http';
import { badRequest, notFound } from '../../lib/errors';
import * as org from './organization.service';

export const organizationRouter = Router();
organizationRouter.use(requireAuth);

organizationRouter.get('/', async (req, res) => {
  res.json(org.toOrganizationDto(await org.getOrganization(getAuth(req).organizationId)));
});

organizationRouter.put('/', requireRole('admin'), async (req, res) => {
  const input = validate(organizationInputSchema, req.body);
  res.json(await org.updateOrganization(getAuth(req).organizationId, input));
});

organizationRouter.get('/logo', async (req, res) => {
  const o = await org.getOrganization(getAuth(req).organizationId);
  if (!o.logo || !o.logoMime) throw notFound('Logo');
  res.setHeader('Content-Type', o.logoMime);
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  res.send(Buffer.from(o.logo));
});

organizationRouter.post('/logo', requireRole('admin'), logoUpload, async (req, res) => {
  if (!req.file) throw badRequest('No logo file uploaded');
  const mime = detectImageMime(req.file.buffer);
  res.json(await org.setLogo(getAuth(req).organizationId, req.file.buffer, mime));
});

organizationRouter.delete('/logo', requireRole('admin'), async (req, res) => {
  res.json(await org.setLogo(getAuth(req).organizationId, null, null));
});
