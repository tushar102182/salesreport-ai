import { z } from 'zod';
import { CURRENCY_CODES, LLM_PROVIDERS, type LlmProvider, type SummaryProvider } from '../constants';
import { languageSchema, optionalText } from './common';

export const organizationInputSchema = z.object({
  name: z.string().trim().min(2, 'name.tooShort').max(120),
  address: optionalText(500),
  phone: optionalText(40),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null))
    .pipe(z.email('email.invalid').nullable()),
  website: optionalText(200),
  taxId: optionalText(60),
  currency: z.enum(CURRENCY_CODES),
  defaultLanguage: languageSchema,
  invoicePrefix: z
    .string()
    .trim()
    .max(12)
    .regex(/^[A-Za-z0-9/_-]*$/, 'invoice.prefixInvalid'),
  defaultTaxRate: z.coerce.number().min(0).max(100),
  invoiceFooter: optionalText(500),
  invoiceNotes: optionalText(1000),
});
export type OrganizationInput = z.input<typeof organizationInputSchema>;

export interface OrganizationDto {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  taxId: string | null;
  currency: string;
  defaultLanguage: 'en' | 'bn';
  invoicePrefix: string;
  nextInvoiceNumber: number;
  defaultTaxRate: number;
  invoiceFooter: string | null;
  invoiceNotes: string | null;
  hasLogo: boolean;
  logoUpdatedAt: string | null;
}

export const aiSettingsInputSchema = z.object({
  provider: z.enum(LLM_PROVIDERS).nullable(),
  model: optionalText(100),
  /** Omit to keep the stored key, empty string or null to leave unchanged; use DELETE to remove. */
  apiKey: z.string().trim().min(8, 'ai.keyTooShort').max(400).optional(),
});
export type AiSettingsInput = z.input<typeof aiSettingsInputSchema>;

export interface AiSettingsDto {
  /** Provider override stored for this organization, or null to use the server env. */
  provider: LlmProvider | null;
  model: string | null;
  /** Masked key, e.g. "sk-…a1B2". Never the full key. */
  apiKeyMasked: string | null;
  hasOrgKey: boolean;
  /** Effective configuration after merging org settings with env. */
  effective: {
    provider: SummaryProvider;
    model: string | null;
    source: 'organization' | 'environment' | 'none';
  };
  demoMode: boolean;
}
