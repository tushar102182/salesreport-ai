import { z } from 'zod';
import type { Language, SummaryProvider } from '../constants';
import { languageSchema } from './common';

const header = z.string().max(200);

export const columnMappingSchema = z
  .object({
    date: header.min(1, 'mapping.required'),
    product: header.min(1, 'mapping.required'),
    quantity: header.optional().nullable(),
    unitPrice: header.optional().nullable(),
    total: header.optional().nullable(),
    customer: header.optional().nullable(),
  })
  .refine((m) => Boolean(m.total) || (Boolean(m.quantity) && Boolean(m.unitPrice)), {
    message: 'mapping.totalOrQtyPrice',
    path: ['total'],
  });
export type ColumnMapping = z.infer<typeof columnMappingSchema>;

export const datasetImportFieldsSchema = z.object({
  name: z.string().trim().min(1, 'required').max(120),
  mapping: z
    .string()
    .max(5000)
    .transform((s, ctx) => {
      try {
        return JSON.parse(s) as unknown;
      } catch {
        ctx.addIssue({ code: 'custom', message: 'mapping.invalidJson' });
        return z.NEVER;
      }
    })
    .pipe(columnMappingSchema),
  dateFormat: z.enum(['auto', 'YMD', 'DMY', 'MDY']).default('auto'),
});

export const summaryRequestSchema = z.object({
  language: languageSchema,
  regenerate: z.boolean().default(false),
});

export const langQuerySchema = z.object({ lang: languageSchema.default('en') });

export interface UploadPreviewDto {
  fileName: string;
  fileType: 'csv' | 'xlsx';
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
  suggestedMapping: Partial<Record<keyof ColumnMapping, string>>;
}

export interface DatasetDto {
  id: string;
  name: string;
  originalFilename: string;
  fileType: 'csv' | 'xlsx';
  rowCount: number;
  skippedRows: number;
  currency: string;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
  totalRevenue?: number;
}

export interface ImportResultDto {
  dataset: DatasetDto;
  imported: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

export interface ProductStat {
  product: string;
  revenue: number;
  quantity: number;
  orders: number;
  share: number;
}

export interface Analytics {
  currency: string;
  totalRevenue: number;
  totalQuantity: number;
  orderCount: number;
  averageOrderValue: number;
  uniqueProducts: number;
  uniqueCustomers: number;
  periodStart: string | null;
  periodEnd: string | null;
  bestProductByRevenue: ProductStat | null;
  bestProductByQuantity: ProductStat | null;
  topProducts: ProductStat[];
  topCustomers: { customer: string; revenue: number; orders: number }[];
  /** 0 = Sunday … 6 = Saturday */
  byWeekday: { weekday: number; revenue: number; orders: number }[];
  bestWeekday: { weekday: number; revenue: number } | null;
  bestDate: { date: string; revenue: number } | null;
  daily: { date: string; revenue: number; orders: number }[];
  monthly: { month: string; revenue: number; orders: number; quantity: number }[];
  /** Growth of the latest complete month vs the previous month, %. null when not computable. */
  monthOverMonthGrowth: number | null;
  /** The two months compared for monthOverMonthGrowth (latest complete month vs. previous). */
  growthMonths: { current: string; previous: string } | null;
  /** Growth of second half of the period vs first half, %. */
  periodGrowth: number | null;
}

export interface AiSummary {
  language: Language;
  provider: SummaryProvider;
  model: string | null;
  headline: string;
  overview: string;
  insights: string[];
  recommendations: string[];
  generatedAt: string;
}
