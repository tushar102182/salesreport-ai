import type { Request, Response } from 'express';
import {
  idParamSchema,
  invoiceInputSchema,
  invoiceListQuerySchema,
  invoiceStatusUpdateSchema,
  langQuerySchema,
} from '@salesreport/shared';
import { validate } from '../../lib/validate';
import { getAuth } from '../../lib/http';
import { contentDisposition } from '../../lib/csv';
import { getOrganization } from '../organization/organization.service';
import { renderInvoicePdf } from '../pdf/invoice.pdf';
import * as service from './invoices.service';

export async function list(req: Request, res: Response) {
  res.json(await service.list(getAuth(req).organizationId, validate(invoiceListQuerySchema, req.query)));
}
export async function get(req: Request, res: Response) {
  res.json(await service.get(getAuth(req).organizationId, validate(idParamSchema, req.params).id));
}
export async function create(req: Request, res: Response) {
  const a = getAuth(req);
  res.status(201).json(await service.create(a.organizationId, a.id, validate(invoiceInputSchema, req.body)));
}
export async function update(req: Request, res: Response) {
  const { id } = validate(idParamSchema, req.params);
  res.json(await service.update(getAuth(req).organizationId, id, validate(invoiceInputSchema, req.body)));
}
export async function setStatus(req: Request, res: Response) {
  const { id } = validate(idParamSchema, req.params);
  const { status } = validate(invoiceStatusUpdateSchema, req.body);
  res.json(await service.setStatus(getAuth(req).organizationId, id, status));
}
export async function remove(req: Request, res: Response) {
  await service.remove(getAuth(req).organizationId, validate(idParamSchema, req.params).id);
  res.status(204).end();
}
export async function pdf(req: Request, res: Response) {
  const orgId = getAuth(req).organizationId;
  const { id } = validate(idParamSchema, req.params);
  const { lang } = validate(langQuerySchema, req.query);
  const [invoice, org] = await Promise.all([service.get(orgId, id), getOrganization(orgId)]);
  const buf = await renderInvoicePdf({ invoice, org, lang });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', contentDisposition(`${invoice.number}-${lang}.pdf`));
  res.setHeader('Cache-Control', 'no-store');
  res.send(buf);
}
export async function exportCsv(req: Request, res: Response) {
  const csv = await service.exportCsv(getAuth(req).organizationId, validate(invoiceListQuerySchema, req.query));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', contentDisposition('invoices.csv'));
  res.send(csv);
}
