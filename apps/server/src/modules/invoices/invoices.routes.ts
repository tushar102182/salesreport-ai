import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { pdfLimiter } from '../../middleware/rateLimit';
import * as c from './invoices.controller';

export const invoicesRouter = Router();
invoicesRouter.use(requireAuth);

invoicesRouter.get('/', c.list);
invoicesRouter.get('/export.csv', c.exportCsv);
invoicesRouter.post('/', c.create);
invoicesRouter.get('/:id', c.get);
invoicesRouter.put('/:id', c.update);
invoicesRouter.patch('/:id/status', c.setStatus);
invoicesRouter.get('/:id/pdf', pdfLimiter, c.pdf);
invoicesRouter.delete('/:id', requireRole('admin'), c.remove);
