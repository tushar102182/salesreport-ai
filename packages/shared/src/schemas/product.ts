import { z } from 'zod';
import { optionalText } from './common';

export const productInputSchema = z.object({
  name: z.string().trim().min(1, 'required').max(150),
  sku: optionalText(60),
  description: optionalText(1000),
  unit: optionalText(30),
  unitPrice: z.coerce.number().min(0, 'number.min0').max(1_000_000_000),
  active: z.boolean().default(true),
});
export type ProductInput = z.input<typeof productInputSchema>;

export interface ProductDto {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  unit: string | null;
  unitPrice: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
