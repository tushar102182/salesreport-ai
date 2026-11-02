import { z } from 'zod';
import { optionalText } from './common';

export const customerInputSchema = z.object({
  name: z.string().trim().min(1, 'required').max(150),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null))
    .pipe(z.email('email.invalid').nullable()),
  phone: optionalText(40),
  address: optionalText(500),
  notes: optionalText(1000),
});
export type CustomerInput = z.input<typeof customerInputSchema>;

export interface CustomerDto {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  invoiceCount?: number;
  createdAt: string;
  updatedAt: string;
}
