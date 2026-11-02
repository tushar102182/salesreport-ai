import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import * as c from './customers.controller';

export const customersRouter = Router();
customersRouter.use(requireAuth);

customersRouter.get('/', c.list);
customersRouter.post('/', c.create);
customersRouter.get('/:id', c.get);
customersRouter.put('/:id', c.update);
customersRouter.delete('/:id', requireRole('admin'), c.remove);
