import { Router } from 'express';
import { createUserSchema, idParamSchema, updateUserSchema } from '@salesreport/shared';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../lib/validate';
import { getAuth } from '../../lib/http';
import * as users from './users.service';

export const usersRouter = Router();
usersRouter.use(requireAuth, requireRole('admin'));

usersRouter.get('/', async (req, res) => {
  res.json({ items: await users.listUsers(getAuth(req).organizationId) });
});

usersRouter.post('/', async (req, res) => {
  const input = validate(createUserSchema, req.body);
  res.status(201).json(await users.createUser(getAuth(req).organizationId, input));
});

usersRouter.patch('/:id', async (req, res) => {
  const { id } = validate(idParamSchema, req.params);
  const input = validate(updateUserSchema, req.body);
  const a = getAuth(req);
  res.json(await users.updateUser(a.organizationId, a.id, id, input));
});

usersRouter.delete('/:id', async (req, res) => {
  const { id } = validate(idParamSchema, req.params);
  const a = getAuth(req);
  await users.deleteUser(a.organizationId, a.id, id);
  res.status(204).end();
});
