export const LANGUAGES = ['en', 'bn'] as const;
export type Language = (typeof LANGUAGES)[number];

export const ROLES = ['admin', 'staff'] as const;
export type Role = (typeof ROLES)[number];

export const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'overdue'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const DISCOUNT_TYPES = ['fixed', 'percent'] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const LLM_PROVIDERS = ['openai', 'gemini', 'anthropic'] as const;
export type LlmProvider = (typeof LLM_PROVIDERS)[number];
export type SummaryProvider = LlmProvider | 'rule-based';

/** Sensible, inexpensive default models. Override with LLM_MODEL or from Settings → AI. */
export const DEFAULT_LLM_MODELS: Record<LlmProvider, string> = {
  openai: 'gpt-4.1-mini',
  gemini: 'gemini-2.5-flash',
  anthropic: 'claude-haiku-4-5',
};

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  /** Number of minor-unit decimals. */
  decimals: number;
}

/** Supported currencies. Add more here — see docs/CUSTOMIZATION.md. */
export const CURRENCIES: CurrencyInfo[] = [
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', decimals: 2 },
  { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2 },
  { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2 },
  { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2 },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimals: 2 },
  { code: 'AED', symbol: 'AED ', name: 'UAE Dirham', decimals: 2 },
  { code: 'SAR', symbol: 'SAR ', name: 'Saudi Riyal', decimals: 2 },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', decimals: 2 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', decimals: 2 },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimals: 2 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimals: 2 },
];
export const CURRENCY_CODES = CURRENCIES.map((c) => c.code) as [string, ...string[]];

export function getCurrency(code: string): CurrencyInfo {
  return CURRENCIES.find((c) => c.code === code) ?? { code, symbol: `${code} `, name: code, decimals: 2 };
}

/** Fields a sales dataset row can be mapped to. */
export const MAPPABLE_FIELDS = ['date', 'product', 'quantity', 'unitPrice', 'total', 'customer'] as const;
export type MappableField = (typeof MAPPABLE_FIELDS)[number];

export const UPLOAD_LIMITS = {
  maxFileBytes: 10 * 1024 * 1024,
  maxRows: 100_000,
  maxLogoBytes: 1024 * 1024,
  previewRows: 20,
} as const;
