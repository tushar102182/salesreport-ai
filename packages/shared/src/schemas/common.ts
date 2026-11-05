import { z } from 'zod';
import { CURRENCY_CODES, LANGUAGES } from '../constants';

export const idSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid id');
export const idParamSchema = z.object({ id: idSchema });

export const languageSchema = z.enum(LANGUAGES);

/** A supported ISO-4217 code used as the display currency (case-insensitive input). */
export const displayCurrencySchema = z.string().trim().toUpperCase().pipe(z.enum(CURRENCY_CODES));

/** Trims and turns empty strings into undefined (for optional form fields). */
export const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(['newest', 'oldest', 'name', 'amount']).optional(),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Error envelope returned by every failing endpoint. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}
