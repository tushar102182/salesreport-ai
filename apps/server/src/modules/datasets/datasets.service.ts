import type { Dataset } from '@prisma/client';
import {
  autoDetectMapping,
  convertAnalytics,
  displayCurrencyFor,
  UPLOAD_LIMITS,
  type AiSummary,
  type Analytics,
  type ColumnMapping,
  type DatasetDto,
  type ImportResultDto,
  type Language,
  type PaginationQuery,
  type UploadPreviewDto,
} from '@salesreport/shared';
import { prisma } from '../../lib/prisma';
import { getFxTable } from '../../lib/fx';
import { badRequest, notFound, unprocessable } from '../../lib/errors';
import { isoDay, paginate } from '../../lib/http';
import { toCsv } from '../../lib/csv';
import { detectSpreadsheetType } from '../../middleware/upload';
import { generateSummary, getCachedSummary, saveSummary } from '../ai/summary.service';
import { computeAnalytics } from './analytics.service';
import { normalizeRows, type DateFormat } from './normalize';
import { parseSpreadsheet } from './parser.service';
import { datasetsRepository as repo } from './datasets.repository';

export const toDatasetDto = (d: Dataset, totalRevenue?: number): DatasetDto => ({
  id: d.id,
  name: d.name,
  originalFilename: d.originalFilename,
  fileType: d.fileType === 'xlsx' ? 'xlsx' : 'csv',
  rowCount: d.rowCount,
  skippedRows: d.skippedRows,
  currency: d.currency,
  periodStart: isoDay(d.periodStart),
  periodEnd: isoDay(d.periodEnd),
  createdAt: d.createdAt.toISOString(),
  ...(totalRevenue !== undefined ? { totalRevenue } : {}),
});

const safeFilename = (name: string) => name.replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 150);

export function preview(file: Express.Multer.File): UploadPreviewDto {
  const fileType = detectSpreadsheetType(file.buffer, file.originalname);
  const { headers, rows } = parseSpreadsheet(file.buffer, fileType);
  if (!rows.length) throw unprocessable('The file has a header row but no data rows');
  return {
    fileName: safeFilename(file.originalname),
    fileType,
    headers,
    rows: rows.slice(0, UPLOAD_LIMITS.previewRows),
    totalRows: rows.length,
    suggestedMapping: autoDetectMapping(headers),
  };
}

export async function importDataset(
  orgId: string,
  userId: string,
  file: Express.Multer.File,
  opts: { name: string; mapping: ColumnMapping; dateFormat: DateFormat; currency?: string },
): Promise<ImportResultDto> {
  const fileType = detectSpreadsheetType(file.buffer, file.originalname);
  const { headers, rows } = parseSpreadsheet(file.buffer, fileType);
  const missing = Object.values(opts.mapping).filter((h): h is string => Boolean(h) && !headers.includes(h as string));
  if (missing.length) throw badRequest(`Mapped column(s) not found in file: ${missing.join(', ')}`);

  const { records, errors, skipped } = normalizeRows(rows, opts.mapping, opts.dateFormat);
  if (!records.length)
    throw unprocessable('No valid rows found. Check the column mapping and date format.', errors.slice(0, 20));

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId }, select: { currency: true } });
  let minT = Infinity;
  let maxT = -Infinity;
  for (const r of records) {
    const t = r.date.getTime();
    if (t < minT) minT = t;
    if (t > maxT) maxT = t;
  }
  const ds = await repo.createWithRecords(
    {
      organizationId: orgId,
      createdById: userId,
      name: opts.name,
      originalFilename: safeFilename(file.originalname),
      fileType,
      rowCount: records.length,
      skippedRows: skipped,
      columnMapping: JSON.stringify(opts.mapping),
      currency: opts.currency ?? org.currency,
      periodStart: new Date(minT),
      periodEnd: new Date(maxT),
    },
    records,
  );
  return { dataset: toDatasetDto(ds), imported: records.length, skipped, errors: errors.slice(0, 50) };
}

export async function list(orgId: string, q: PaginationQuery) {
  const { items, total } = await repo.list(orgId, { q: q.q, skip: (q.page - 1) * q.pageSize, take: q.pageSize });
  const sums = await repo.revenueByDataset(items.map((d) => d.id));
  const byId = new Map(sums.map((s) => [s.datasetId, s._sum.total ?? 0]));
  return paginate(
    items.map((d) => toDatasetDto(d, Math.round((byId.get(d.id) ?? 0) * 100) / 100)),
    total,
    q.page,
    q.pageSize,
  );
}

export async function getEntity(orgId: string, id: string) {
  const ds = await repo.findById(orgId, id);
  if (!ds) throw notFound('Dataset');
  return ds;
}

export async function get(orgId: string, id: string) {
  const ds = await getEntity(orgId, id);
  return { ...toDatasetDto(ds), columnMapping: JSON.parse(ds.columnMapping) as ColumnMapping };
}

export async function analyticsFor(ds: Dataset): Promise<Analytics> {
  return computeAnalytics(await repo.records(ds.id), ds.currency);
}

/** Analytics converted to `displayCurrency` (approximate rates); unchanged when absent or not convertible. */
export async function analyticsIn(ds: Dataset, displayCurrency?: string): Promise<Analytics> {
  const a = await analyticsFor(ds);
  if (!displayCurrency) return a;
  const { rates } = await getFxTable();
  return convertAnalytics(a, displayCurrency, rates);
}

export async function analytics(orgId: string, id: string, displayCurrency?: string) {
  return analyticsIn(await getEntity(orgId, id), displayCurrency);
}

/** The currency a summary/report for this dataset will be written in. */
async function targetCurrency(ds: Dataset, displayCurrency?: string) {
  if (!displayCurrency) return ds.currency;
  const { rates } = await getFxTable();
  return displayCurrencyFor(ds.currency, displayCurrency, rates);
}

/**
 * Returns the cached summary for the language and display currency, generating it on
 * first request or when regenerate=true. Amounts in the text are written in the display
 * currency (converted at approximate rates); summaries are cached per currency.
 */
export async function summary(
  orgId: string,
  id: string,
  lang: Language,
  regenerate: boolean,
  displayCurrency?: string,
) {
  const ds = await getEntity(orgId, id);
  const currency = await targetCurrency(ds, displayCurrency);
  if (!regenerate) {
    const cached = await getCachedSummary(ds.id, lang, currency, ds.currency);
    if (cached) return { summary: cached, cached: true };
  }
  const result = await generateSummary(orgId, await analyticsIn(ds, currency), lang);
  const { fallbackReason, ...summaryData } = result;
  const saved: AiSummary = { ...(summaryData as AiSummary), currency };
  await saveSummary(ds.id, saved, ds.currency);
  return { summary: saved, cached: false, ...(fallbackReason ? { fallbackReason } : {}) };
}

export async function getSummaryIfExists(orgId: string, id: string, lang: Language, displayCurrency?: string) {
  const ds = await getEntity(orgId, id);
  return getCachedSummary(ds.id, lang, await targetCurrency(ds, displayCurrency), ds.currency);
}

export async function exportCsv(orgId: string, id: string) {
  const ds = await getEntity(orgId, id);
  const rows = await repo.records(ds.id);
  return {
    filename: `${ds.name}.csv`,
    csv: toCsv(
      ['Date', 'Product', 'Quantity', 'Unit price', 'Total', 'Customer'],
      rows.map((r) => [isoDay(r.date), r.product, r.quantity, r.unitPrice, r.total, r.customer ?? '']),
    ),
  };
}

export async function remove(orgId: string, id: string) {
  if ((await repo.remove(orgId, id)) === 0) throw notFound('Dataset');
}
