import type { Request, Response } from 'express';
import {
  datasetImportFieldsSchema,
  idParamSchema,
  currencyQuerySchema,
  documentQuerySchema,
  paginationQuerySchema,
  summaryRequestSchema,
} from '@salesreport/shared';
import { validate } from '../../lib/validate';
import { getAuth } from '../../lib/http';
import { badRequest } from '../../lib/errors';
import { contentDisposition } from '../../lib/csv';
import { getFxTable, requestedDisplayCurrency } from '../../lib/fx';
import { getOrganization } from '../organization/organization.service';
import { renderReportPdf } from '../pdf/report.pdf';
import * as service from './datasets.service';

export async function list(req: Request, res: Response) {
  res.json(await service.list(getAuth(req).organizationId, validate(paginationQuerySchema, req.query)));
}

export async function preview(req: Request, res: Response) {
  if (!req.file) throw badRequest('No file uploaded (field name: "file")');
  res.json(service.preview(req.file));
}

export async function importDataset(req: Request, res: Response) {
  if (!req.file) throw badRequest('No file uploaded (field name: "file")');
  const fields = validate(datasetImportFieldsSchema, req.body);
  const a = getAuth(req);
  res.status(201).json(await service.importDataset(a.organizationId, a.id, req.file, fields));
}

export async function get(req: Request, res: Response) {
  res.json(await service.get(getAuth(req).organizationId, validate(idParamSchema, req.params).id));
}

export async function analytics(req: Request, res: Response) {
  const { currency } = validate(currencyQuerySchema, req.query);
  res.json(
    await service.analytics(
      getAuth(req).organizationId,
      validate(idParamSchema, req.params).id,
      requestedDisplayCurrency(req, currency),
    ),
  );
}

export async function getSummary(req: Request, res: Response) {
  const { id } = validate(idParamSchema, req.params);
  const { lang, currency } = validate(documentQuerySchema, req.query);
  res.json({
    summary: await service.getSummaryIfExists(
      getAuth(req).organizationId,
      id,
      lang,
      requestedDisplayCurrency(req, currency),
    ),
  });
}

export async function createSummary(req: Request, res: Response) {
  const { id } = validate(idParamSchema, req.params);
  const { language, regenerate, currency } = validate(summaryRequestSchema, req.body);
  res.json(
    await service.summary(
      getAuth(req).organizationId,
      id,
      language,
      regenerate,
      requestedDisplayCurrency(req, currency),
    ),
  );
}

export async function reportPdf(req: Request, res: Response) {
  const orgId = getAuth(req).organizationId;
  const { id } = validate(idParamSchema, req.params);
  const { lang, currency } = validate(documentQuerySchema, req.query);
  const display = requestedDisplayCurrency(req, currency);
  const ds = await service.getEntity(orgId, id);
  const [analytics, org, { summary }, fx] = await Promise.all([
    service.analyticsIn(ds, display),
    getOrganization(orgId),
    service.summary(orgId, id, lang, false, display),
    getFxTable(),
  ]);
  const pdf = await renderReportPdf({
    org,
    dataset: service.toDatasetDto(ds),
    analytics,
    summary,
    lang,
    fx: analytics.currency !== ds.currency ? { from: ds.currency, asOf: fx.asOf, rates: fx.rates } : undefined,
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', contentDisposition(`${ds.name} - report-${lang}.pdf`));
  res.setHeader('Cache-Control', 'no-store');
  res.send(pdf);
}

export async function exportCsv(req: Request, res: Response) {
  const { filename, csv } = await service.exportCsv(
    getAuth(req).organizationId,
    validate(idParamSchema, req.params).id,
  );
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', contentDisposition(filename));
  res.send(csv);
}

export async function remove(req: Request, res: Response) {
  await service.remove(getAuth(req).organizationId, validate(idParamSchema, req.params).id);
  res.status(204).end();
}
