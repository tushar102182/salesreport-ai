/**
 * Regenerates /sample-data: an English CSV, an XLSX workbook and a Bangla-header CSV
 * with 6 months (May–Oct 2026) of realistic sales. Run: npm run sample-data
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { toBanglaDigits } from '@salesreport/shared';
import { generateSales } from '../src/demo/generator';

const out = path.resolve(process.cwd(), '../../sample-data');
mkdirSync(out, { recursive: true });

const days = 184; // 1 May → 31 Oct 2026
const sales = generateSales(new Date(Date.UTC(2026, 9, 31)), days, 96);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const q = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

// English CSV
const en = ['Order Date,Product Name,Quantity,Unit Price,Total,Customer'];
for (const s of sales)
  en.push([iso(s.date), q(s.product.name), s.quantity, s.unitPrice, s.total, q(s.customer.name)].join(','));
writeFileSync(path.join(out, 'sales-sample.csv'), `${en.join('\n')}\n`);

// XLSX with real date cells and number formats
// SheetJS converts JS dates using the local timezone, so build local-midnight dates.
const localDate = (d: Date) => new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
const rows = sales.map((s) => ({
  Date: localDate(s.date),
  Product: s.product.name,
  Qty: s.quantity,
  'Unit Price (BDT)': s.unitPrice,
  'Line Total (BDT)': s.total,
  Customer: s.customer.name,
}));
const ws = XLSX.utils.json_to_sheet(rows, { cellDates: true, dateNF: 'yyyy-mm-dd' });
ws['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 6 }, { wch: 16 }, { wch: 16 }, { wch: 26 }];
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Sales');
writeFileSync(
  path.join(out, 'sales-sample.xlsx'),
  XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', compression: true }) as Buffer,
);

// Bangla headers, Bangla product names, DD/MM/YYYY dates and Bangla digits (first 2 months)
const bn = ['তারিখ,পণ্য,পরিমাণ,একক মূল্য,মোট,গ্রাহক'];
for (const s of sales.filter((x) => x.date.getUTCMonth() <= 5)) {
  const d = s.date;
  const date = `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
  bn.push(
    [
      toBanglaDigits(date),
      q(s.product.nameBn),
      toBanglaDigits(s.quantity),
      toBanglaDigits(s.unitPrice),
      toBanglaDigits(s.total),
      q(s.customer.name),
    ].join(','),
  );
}
writeFileSync(path.join(out, 'sales-sample-bangla.csv'), `\uFEFF${bn.join('\n')}\n`);

console.log(`✔ Wrote ${sales.length} rows to ${out}`);
