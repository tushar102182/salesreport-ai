import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { aiLimiter, pdfLimiter, uploadLimiter } from '../../middleware/rateLimit';
import { spreadsheetUpload } from '../../middleware/upload';
import * as c from './datasets.controller';

export const datasetsRouter = Router();
datasetsRouter.use(requireAuth);

datasetsRouter.get('/', c.list);
datasetsRouter.post('/preview', uploadLimiter, spreadsheetUpload, c.preview);
datasetsRouter.post('/', uploadLimiter, spreadsheetUpload, c.importDataset);
datasetsRouter.get('/:id', c.get);
datasetsRouter.get('/:id/analytics', c.analytics);
datasetsRouter.get('/:id/summary', c.getSummary);
datasetsRouter.post('/:id/summary', aiLimiter, c.createSummary);
datasetsRouter.get('/:id/report.pdf', pdfLimiter, c.reportPdf);
datasetsRouter.get('/:id/export.csv', c.exportCsv);
datasetsRouter.delete('/:id', requireRole('admin'), c.remove);
