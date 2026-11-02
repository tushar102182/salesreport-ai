import { fromBanglaDigits, roundMoney, type ColumnMapping } from '@salesreport/shared';

export type DateFormat = 'auto' | 'YMD' | 'DMY' | 'MDY';

export interface NormalizedRecord {
  date: Date;
  product: string;
  quantity: number;
  unitPrice: number;
  total: number;
  customer: string | null;
}

/**
 * Parses "৳1,250.50", "$ 1.200", "(300)", "১২৫০", "1 250,5"… into a number.
 * Returns null when the cell is empty or not numeric.
 */
export function parseNumber(raw: string | undefined | null): number | null {
  if (raw === undefined || raw === null) return null;
  let s = fromBanglaDigits(String(raw)).trim();
  if (!s) return null;
  const negative = /^\(.*\)$/.test(s) || /^-/.test(s.replace(/[^\d.,()-]/g, ''));
  s = s.replace(/[^\d.,]/g, '');
  if (!s) return null;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > lastDot && s.length - lastComma - 1 !== 3) {
    // European decimal comma: "1.250,50" or "12,5"
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    s = s.replace(/,/g, '');
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const utc = (y: number, m: number, d: number) => {
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCMonth() === m - 1 ? date : null;
};

/** Detects whether ambiguous numeric dates are day-first or month-first. Defaults to DMY (Bangladesh). */
export function detectDateFormat(samples: string[]): Exclude<DateFormat, 'auto'> {
  let dmy = 0;
  let mdy = 0;
  for (const s of samples) {
    const m = fromBanglaDigits(s)
      .trim()
      .match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
    if (!m) continue;
    if (Number(m[1]) > 12) dmy++;
    if (Number(m[2]) > 12) mdy++;
  }
  return mdy > dmy ? 'MDY' : 'DMY';
}

/** Parses ISO, DMY/MDY with / . -, "12 Mar 2026", "Mar 12, 2026" and Excel serial numbers. Returns a UTC midnight date. */
export function parseDate(raw: string | undefined | null, format: Exclude<DateFormat, 'auto'> = 'DMY'): Date | null {
  if (!raw) return null;
  const s = fromBanglaDigits(String(raw)).trim();
  if (!s) return null;

  let m = s.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})(?:[T\s].*)?$/);
  if (m) return utc(Number(m[1]), Number(m[2]), Number(m[3]));

  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})(?:\s.*)?$/);
  if (m) {
    let y = Number(m[3]);
    if (y < 100) y += 2000;
    const [a, b] = [Number(m[1]), Number(m[2])];
    return format === 'MDY' ? utc(y, a, b) : format === 'YMD' ? null : utc(y, b, a);
  }

  m = s.match(/^(\d{1,2})[\s-]([A-Za-z]{3,9})[\s,-]+(\d{4})$/);
  if (m) return utc(Number(m[3]), MONTHS[m[2]!.slice(0, 3).toLowerCase()] ?? 0, Number(m[1]));
  m = s.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m) return utc(Number(m[3]), MONTHS[m[1]!.slice(0, 3).toLowerCase()] ?? 0, Number(m[2]));

  // Excel serial date (days since 1899-12-30)
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const serial = Math.floor(Number(s));
    if (serial > 20000 && serial < 80000) {
      const d = new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000);
      return utc(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    }
  }
  return null;
}

export interface NormalizeResult {
  records: NormalizedRecord[];
  errors: { row: number; message: string }[];
  skipped: number;
}

/**
 * Converts raw rows into validated sales records using the column mapping.
 * `total` is taken from the total column, or computed as quantity × unit price.
 * Row numbers in errors are 1-based spreadsheet rows (header = row 1).
 */
export function normalizeRows(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  dateFormat: DateFormat = 'auto',
): NormalizeResult {
  const fmt =
    dateFormat === 'auto' ? detectDateFormat(rows.slice(0, 500).map((r) => r[mapping.date] ?? '')) : dateFormat;
  const records: NormalizedRecord[] = [];
  const errors: NormalizeResult['errors'] = [];
  const fail = (row: number, message: string) => {
    if (errors.length < 100) errors.push({ row, message });
  };

  rows.forEach((r, i) => {
    const rowNo = i + 2;
    const date = parseDate(r[mapping.date], fmt);
    if (!date) return fail(rowNo, `Invalid date "${(r[mapping.date] ?? '').slice(0, 40)}"`);
    const product = (r[mapping.product] ?? '').trim().slice(0, 200);
    if (!product) return fail(rowNo, 'Missing product');

    let quantity = mapping.quantity ? parseNumber(r[mapping.quantity]) : null;
    let unitPrice = mapping.unitPrice ? parseNumber(r[mapping.unitPrice]) : null;
    let total = mapping.total ? parseNumber(r[mapping.total]) : null;

    if (total === null && quantity !== null && unitPrice !== null) total = quantity * unitPrice;
    if (total === null) return fail(rowNo, 'Missing total (or quantity × unit price)');
    if (quantity === null || quantity === 0) quantity = unitPrice ? total / unitPrice : 1;
    if (unitPrice === null) unitPrice = quantity ? total / quantity : total;
    if (![quantity, unitPrice, total].every(Number.isFinite) || Math.abs(total) > 1e12) {
      return fail(rowNo, 'Invalid numeric value');
    }
    const customer = mapping.customer ? (r[mapping.customer] ?? '').trim().slice(0, 200) || null : null;
    records.push({
      date,
      product,
      quantity: roundMoney(quantity, 4),
      unitPrice: roundMoney(unitPrice, 2),
      total: roundMoney(total, 2),
      customer,
    });
  });

  return { records, errors, skipped: rows.length - records.length };
}
