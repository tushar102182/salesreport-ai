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
  { code: 'JPY', symbol: 'JPY ', name: 'Japanese Yen', decimals: 0 },
  { code: 'CNY', symbol: 'CNY ', name: 'Chinese Yuan', decimals: 2 },
  { code: 'CHF', symbol: 'CHF ', name: 'Swiss Franc', decimals: 2 },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', decimals: 2 },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', decimals: 2 },
  { code: 'PKR', symbol: 'PKR ', name: 'Pakistani Rupee', decimals: 2 },
  { code: 'NPR', symbol: 'NPR ', name: 'Nepalese Rupee', decimals: 2 },
  { code: 'LKR', symbol: 'LKR ', name: 'Sri Lankan Rupee', decimals: 2 },
  { code: 'IDR', symbol: 'Rp ', name: 'Indonesian Rupiah', decimals: 0 },
  { code: 'PHP', symbol: 'PHP ', name: 'Philippine Peso', decimals: 2 },
  { code: 'THB', symbol: 'THB ', name: 'Thai Baht', decimals: 2 },
  { code: 'VND', symbol: 'VND ', name: 'Vietnamese Dong', decimals: 0 },
  { code: 'KRW', symbol: 'KRW ', name: 'South Korean Won', decimals: 0 },
  { code: 'QAR', symbol: 'QAR ', name: 'Qatari Riyal', decimals: 2 },
  { code: 'KWD', symbol: 'KWD ', name: 'Kuwaiti Dinar', decimals: 3 },
  { code: 'BHD', symbol: 'BHD ', name: 'Bahraini Dinar', decimals: 3 },
  { code: 'OMR', symbol: 'OMR ', name: 'Omani Rial', decimals: 3 },
  { code: 'EGP', symbol: 'EGP ', name: 'Egyptian Pound', decimals: 2 },
  { code: 'TRY', symbol: 'TRY ', name: 'Turkish Lira', decimals: 2 },
  { code: 'NGN', symbol: 'NGN ', name: 'Nigerian Naira', decimals: 2 },
  { code: 'KES', symbol: 'KES ', name: 'Kenyan Shilling', decimals: 2 },
  { code: 'ZAR', symbol: 'R ', name: 'South African Rand', decimals: 2 },
  { code: 'GHS', symbol: 'GHS ', name: 'Ghanaian Cedi', decimals: 2 },
  { code: 'MAD', symbol: 'MAD ', name: 'Moroccan Dirham', decimals: 2 },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', decimals: 2 },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', decimals: 2 },
  { code: 'ARS', symbol: 'ARS ', name: 'Argentine Peso', decimals: 2 },
  { code: 'COP', symbol: 'COP ', name: 'Colombian Peso', decimals: 2 },
  { code: 'CLP', symbol: 'CLP ', name: 'Chilean Peso', decimals: 0 },
  { code: 'SEK', symbol: 'SEK ', name: 'Swedish Krona', decimals: 2 },
  { code: 'NOK', symbol: 'NOK ', name: 'Norwegian Krone', decimals: 2 },
  { code: 'DKK', symbol: 'DKK ', name: 'Danish Krone', decimals: 2 },
  { code: 'PLN', symbol: 'PLN ', name: 'Polish Zloty', decimals: 2 },
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
