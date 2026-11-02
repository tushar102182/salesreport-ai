import type { Request, Response } from 'express';
import { customerInputSchema, idParamSchema, paginationQuerySchema } from '@salesreport/shared';
import { validate } from '../../lib/validate';
import { getAuth } from '../../lib/http';
import * as service from './customers.service';

export async function list(req: Request, res: Response) {
  res.json(await service.list(getAuth(req).organizationId, validate(paginationQuerySchema, req.query)));
}
export async function get(req: Request, res: Response) {
  res.json(await service.get(getAuth(req).organizationId, validate(idParamSchema, req.params).id));
}
export async function create(req: Request, res: Response) {
  res.status(201).json(await service.create(getAuth(req).organizationId, validate(customerInputSchema, req.body)));
}
export async function update(req: Request, res: Response) {
  const { id } = validate(idParamSchema, req.params);
  res.json(await service.update(getAuth(req).organizationId, id, validate(customerInputSchema, req.body)));
}
export async function remove(req: Request, res: Response) {
  await service.remove(getAuth(req).organizationId, validate(idParamSchema, req.params).id);
  res.status(204).end();
}
