import { getCurrency, type Language } from './constants';

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/** Converts ASCII digits in a string to Bangla digits (১২৩). */
export function toBanglaDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)] ?? d);
}

/** Converts Bangla digits back to ASCII digits. */
export function fromBanglaDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
}

/** Rounds half-away-from-zero to `decimals` places, avoiding binary float drift. */
export function roundMoney(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  const n = Math.round((Math.abs(value) + Number.EPSILON) * factor) / factor;
  return value < 0 ? -n : n;
}

/**
 * Groups digits. Bangla uses the South-Asian lakh/crore grouping (১২,৩৪,৫৬৭);
 * for BDT/INR the same grouping is used in English too.
 */
function groupDigits(intPart: string, southAsian: boolean): string {
  if (!southAsian) return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (intPart.length <= 3) return intPart;
  const last3 = intPart.slice(-3);
  const rest = intPart.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${last3}`;
}

export interface FormatNumberOptions {
  decimals?: number;
  /** Force lakh/crore grouping. Defaults to true for Bangla. */
  southAsian?: boolean;
}

export function formatNumber(value: number, lang: Language = 'en', opts: FormatNumberOptions = {}): string {
  const decimals = opts.decimals ?? (Number.isInteger(value) ? 0 : 2);
  const southAsian = opts.southAsian ?? lang === 'bn';
  const fixed = Math.abs(roundMoney(value, decimals)).toFixed(decimals);
  const [i = '0', f] = fixed.split('.');
  const out = `${value < 0 ? '-' : ''}${groupDigits(i, southAsian)}${f ? `.${f}` : ''}`;
  return lang === 'bn' ? toBanglaDigits(out) : out;
}

export function formatMoney(amount: number, currencyCode: string, lang: Language = 'en'): string {
  const c = getCurrency(currencyCode);
  const southAsian = lang === 'bn' || c.code === 'BDT' || c.code === 'INR';
  return `${c.symbol}${formatNumber(amount, lang, { decimals: c.decimals, southAsian })}`;
}

export function formatPercent(value: number | null, lang: Language = 'en', decimals = 1): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatNumber(value, lang, { decimals, southAsian: false })}%`;
}

const MONTHS: Record<Language, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  bn: ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'],
};
const MONTHS_LONG: Record<Language, string[]> = {
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  bn: [
    'জানুয়ারি',
    'ফেব্রুয়ারি',
    'মার্চ',
    'এপ্রিল',
    'মে',
    'জুন',
    'জুলাই',
    'আগস্ট',
    'সেপ্টেম্বর',
    'অক্টোবর',
    'নভেম্বর',
    'ডিসেম্বর',
  ],
};
export const WEEKDAYS: Record<Language, string[]> = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  bn: ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'],
};

/** Formats an ISO date (YYYY-MM-DD or full ISO) as "12 Mar 2026" / "১২ মার্চ ২০২৬". UTC-based. */
export function formatDate(iso: string | Date, lang: Language = 'en', long = false): string {
  const d = typeof iso === 'string' ? new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  const m = (long ? MONTHS_LONG : MONTHS)[lang][d.getUTCMonth()];
  const out = `${d.getUTCDate()} ${m} ${d.getUTCFullYear()}`;
  return lang === 'bn' ? toBanglaDigits(out) : out;
}

/** "2026-03" → "Mar 2026" / "মার্চ ২০২৬" */
export function formatMonthKey(key: string, lang: Language = 'en', long = false): string {
  const [y, m] = key.split('-');
  const name = (long ? MONTHS_LONG : MONTHS)[lang][Number(m) - 1] ?? key;
  const out = `${name} ${y}`;
  return lang === 'bn' ? toBanglaDigits(out) : out;
}

/**
 * Compact number for chart axes. BDT/INR use lakh/crore (L/Cr, লাখ/কোটি);
 * other currencies use K/M/B.
 */
export function compactNumber(value: number, lang: Language = 'en', currencyCode = 'BDT'): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const fmt = (n: number, unit: string) => {
    const s = `${sign}${Number(n.toFixed(n >= 100 ? 0 : 1))}${unit}`;
    return lang === 'bn' ? toBanglaDigits(s) : s;
  };
  if (currencyCode === 'BDT' || currencyCode === 'INR') {
    if (abs >= 1e7) return fmt(abs / 1e7, lang === 'bn' ? ' কোটি' : 'Cr');
    if (abs >= 1e5) return fmt(abs / 1e5, lang === 'bn' ? ' লাখ' : 'L');
    if (abs >= 1e3) return fmt(abs / 1e3, lang === 'bn' ? ' হা.' : 'K');
  } else {
    if (abs >= 1e9) return fmt(abs / 1e9, 'B');
    if (abs >= 1e6) return fmt(abs / 1e6, 'M');
    if (abs >= 1e3) return fmt(abs / 1e3, 'K');
  }
  return fmt(abs, '');
}
