import { z } from 'zod';
import { CURRENCY_CODES, DISCOUNT_TYPES, INVOICE_STATUSES } from '../constants';
import { idSchema, languageSchema, optionalText, paginationQuerySchema } from './common';

export const invoiceStatusSchema = z.enum(INVOICE_STATUSES);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'date.invalid')
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), 'date.invalid');

export const invoiceItemInputSchema = z.object({
  productId: idSchema.optional().nullable(),
  description: z.string().trim().min(1, 'required').max(300),
  quantity: z.coerce.number().positive('number.positive').max(1_000_000),
  unitPrice: z.coerce.number().min(0, 'number.min0').max(1_000_000_000),
});
export type InvoiceItemInput = z.input<typeof invoiceItemInputSchema>;

export const invoiceInputSchema = z
  .object({
    customerId: idSchema,
    issueDate: isoDate,
    dueDate: isoDate.optional().nullable(),
    status: invoiceStatusSchema.default('draft'),
    currency: z.enum(CURRENCY_CODES).optional(),
    language: languageSchema.default('en'),
    taxRate: z.coerce.number().min(0).max(100).default(0),
    discountType: z.enum(DISCOUNT_TYPES).default('fixed'),
    discountValue: z.coerce.number().min(0).max(1_000_000_000).default(0),
    notes: optionalText(2000),
    items: z.array(invoiceItemInputSchema).min(1, 'invoice.itemsRequired').max(200),
  })
  .refine((v) => !v.dueDate || v.dueDate >= v.issueDate, {
    message: 'invoice.dueBeforeIssue',
    path: ['dueDate'],
  })
  .refine((v) => v.discountType !== 'percent' || v.discountValue <= 100, {
    message: 'invoice.discountPercentMax',
    path: ['discountValue'],
  });
export type InvoiceInput = z.input<typeof invoiceInputSchema>;
export type InvoiceInputParsed = z.output<typeof invoiceInputSchema>;

export const invoiceStatusUpdateSchema = z.object({ status: invoiceStatusSchema });

export const invoiceListQuerySchema = paginationQuerySchema.extend({
  status: invoiceStatusSchema.optional(),
  customerId: idSchema.optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
});
export type InvoiceListQuery = z.infer<typeof invoiceListQuerySchema>;

export interface InvoiceItemDto {
  id: string;
  productId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface InvoiceDto {
  id: string;
  number: string;
  status: (typeof INVOICE_STATUSES)[number];
  issueDate: string;
  dueDate: string | null;
  currency: string;
  language: 'en' | 'bn';
  taxRate: number;
  discountType: (typeof DISCOUNT_TYPES)[number];
  discountValue: number;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  notes: string | null;
  paidAt: string | null;
  customer: { id: string; name: string; email: string | null; phone: string | null; address: string | null };
  items: InvoiceItemDto[];
  createdAt: string;
  updatedAt: string;
}

export type InvoiceListItemDto = Omit<InvoiceDto, 'items'>;
