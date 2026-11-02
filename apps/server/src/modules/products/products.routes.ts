import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import * as c from './products.controller';

export const productsRouter = Router();
productsRouter.use(requireAuth);

productsRouter.get('/', c.list);
productsRouter.post('/', c.create);
productsRouter.get('/:id', c.get);
productsRouter.put('/:id', c.update);
productsRouter.delete('/:id', requireRole('admin'), c.remove);
