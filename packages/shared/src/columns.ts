import type { ColumnMapping } from './schemas/dataset';

/** Header synonyms (English + Bangla + common export formats), lower-cased. */
const SYNONYMS: Record<keyof ColumnMapping, string[]> = {
  date: [
    'date',
    'order date',
    'sale date',
    'invoice date',
    'transaction date',
    'created at',
    'created',
    'day',
    'timestamp',
    'তারিখ',
    'বিক্রয়ের তারিখ',
  ],
  product: [
    'product',
    'product name',
    'item',
    'item name',
    'sku name',
    'description',
    'name',
    'পণ্য',
    'পণ্যের নাম',
    'আইটেম',
  ],
  quantity: ['quantity', 'qty', 'units', 'unit sold', 'units sold', 'count', 'pcs', 'পরিমাণ', 'সংখ্যা'],
  unitPrice: ['unit price', 'price', 'unit cost', 'rate', 'price per unit', 'unit_price', 'একক মূল্য', 'দাম', 'মূল্য'],
  total: [
    'total',
    'amount',
    'total amount',
    'line total',
    'revenue',
    'sales',
    'net sales',
    'subtotal',
    'grand total',
    'মোট',
    'মোট মূল্য',
    'বিক্রয়',
    'টাকা',
  ],
  customer: ['customer', 'customer name', 'client', 'buyer', 'account', 'গ্রাহক', 'ক্রেতা', 'গ্রাহকের নাম'],
};

const normalize = (h: string) =>
  h
    .toLowerCase()
    .replace(/[_\-.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\(.*?\)/g, '')
    .trim();

/**
 * Suggests a column mapping from file headers. Exact synonym matches win,
 * then "contains" matches. Each header is used at most once.
 */
export function autoDetectMapping(headers: string[]): Partial<Record<keyof ColumnMapping, string>> {
  const result: Partial<Record<keyof ColumnMapping, string>> = {};
  const used = new Set<string>();
  const fields = Object.keys(SYNONYMS) as (keyof ColumnMapping)[];
  const normalized = headers.map((h) => ({ raw: h, n: normalize(h) }));

  for (const pass of ['exact', 'contains'] as const) {
    for (const field of fields) {
      if (result[field]) continue;
      const syns = SYNONYMS[field];
      const hit = normalized.find(
        ({ raw, n }) =>
          !used.has(raw) && (pass === 'exact' ? syns.includes(n) : syns.some((s) => s.length > 2 && n.includes(s))),
      );
      if (hit) {
        result[field] = hit.raw;
        used.add(hit.raw);
      }
    }
  }
  return result;
}
