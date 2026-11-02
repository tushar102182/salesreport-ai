import request from 'supertest';
import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { sanitizeCsvCell, toCsv } from '../src/lib/csv';
import { normalizeRows, parseDate, parseNumber } from '../src/modules/datasets/normalize';
import { parseCsv, parseXlsx } from '../src/modules/datasets/parser.service';
import { getApp, registerOrg } from './helpers';

const CSV = [
  'Order Date,Product Name,Qty,Unit Price,Line Total,Customer',
  '2026-01-05,Miniket Rice 25kg,2,1950,3900,Rahim Traders',
  '06/01/2026,Soybean Oil 5L,3,895,,Karim Enterprise',
  '2026-02-10,"Tea, Premium 400g",4,260,1040,=HYPERLINK("http://evil")',
  'not-a-date,Broken,1,1,1,X',
].join('\n');

describe('parsing helpers', () => {
  it('parses numbers in many formats', () => {
    expect(parseNumber('৳1,250.50')).toBe(1250.5);
    expect(parseNumber('১২,৫০০')).toBe(12500);
    expect(parseNumber('1,25,000')).toBe(125000);
    expect(parseNumber('1.250,75')).toBe(1250.75);
    expect(parseNumber('(300)')).toBe(-300);
    expect(parseNumber('')).toBeNull();
  });

  it('parses dates (ISO, DMY, month names, Excel serial)', () => {
    expect(parseDate('2026-03-15')?.toISOString().slice(0, 10)).toBe('2026-03-15');
    expect(parseDate('15/03/2026', 'DMY')?.toISOString().slice(0, 10)).toBe('2026-03-15');
    expect(parseDate('03/15/2026', 'MDY')?.toISOString().slice(0, 10)).toBe('2026-03-15');
    expect(parseDate('15 Mar 2026')?.toISOString().slice(0, 10)).toBe('2026-03-15');
    expect(parseDate('46096')?.toISOString().slice(0, 10)).toBe('2026-03-15');
    expect(parseDate('31/02/2026')).toBeNull();
  });

  it('parses CSV and normalizes rows with the mapping, computing missing totals', () => {
    const { headers, rows } = parseCsv(Buffer.from(CSV));
    expect(headers).toHaveLength(6);
    const result = normalizeRows(rows, {
      date: 'Order Date',
      product: 'Product Name',
      quantity: 'Qty',
      unitPrice: 'Unit Price',
      total: 'Line Total',
      customer: 'Customer',
    });
    expect(result.records).toHaveLength(3);
    expect(result.records[1]!.total).toBe(2685);
    expect(result.records[1]!.date.toISOString().slice(0, 10)).toBe('2026-01-06');
    expect(result.skipped).toBe(1);
    expect(result.errors[0]!.row).toBe(5);
  });

  it('parses XLSX with real date cells', () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Date', 'Product', 'Total'],
      [new Date(Date.UTC(2026, 2, 15)), 'Sugar 1kg', 140],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    const { rows } = parseXlsx(buf);
    const res = normalizeRows(rows, { date: 'Date', product: 'Product', total: 'Total' });
    expect(res.records).toHaveLength(1);
    expect(res.records[0]!.date.toISOString().slice(0, 10)).toBe('2026-03-15');
  });

  it('neutralizes CSV formula injection on export', () => {
    expect(sanitizeCsvCell('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
    expect(sanitizeCsvCell('+cmd')).toBe("'+cmd");
    expect(sanitizeCsvCell('@x')).toBe("'@x");
    expect(sanitizeCsvCell(-42)).toBe('-42');
    expect(toCsv(['a'], [['=1+1']])).toContain("'=1+1");
  });
});

describe('dataset upload API', () => {
  it('previews, imports, analyses, summarizes, exports and renders a PDF report', async () => {
    const { auth } = await registerOrg('Upload Co');
    const preview = await request(getApp())
      .post('/api/datasets/preview')
      .set(auth)
      .attach('file', Buffer.from(CSV), { filename: 'sales.csv', contentType: 'text/csv' })
      .expect(200);
    expect(preview.body.totalRows).toBe(4);
    expect(preview.body.suggestedMapping).toMatchObject({
      date: 'Order Date',
      product: 'Product Name',
      total: 'Line Total',
    });

    const imported = await request(getApp())
      .post('/api/datasets')
      .set(auth)
      .field('name', 'Q1 sales')
      .field('mapping', JSON.stringify(preview.body.suggestedMapping))
      .attach('file', Buffer.from(CSV), { filename: 'sales.csv', contentType: 'text/csv' })
      .expect(201);
    expect(imported.body.imported).toBe(3);
    const id = imported.body.dataset.id as string;

    const analytics = await request(getApp()).get(`/api/datasets/${id}/analytics`).set(auth).expect(200);
    expect(analytics.body.totalRevenue).toBe(7625);
    expect(analytics.body.bestProductByRevenue.product).toBe('Miniket Rice 25kg');

    const summary = await request(getApp())
      .post(`/api/datasets/${id}/summary`)
      .set(auth)
      .send({ language: 'bn' })
      .expect(200);
    expect(summary.body.summary.provider).toBe('rule-based');
    expect(summary.body.summary.headline).toMatch(/[\u0980-\u09FF]/);

    const csv = await request(getApp()).get(`/api/datasets/${id}/export.csv`).set(auth).expect(200);
    expect(csv.text).toContain(`'=HYPERLINK`);

    const pdf = await request(getApp())
      .get(`/api/datasets/${id}/report.pdf?lang=bn`)
      .set(auth)
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(pdf.headers['content-type']).toBe('application/pdf');
    expect((pdf.body as Buffer).subarray(0, 4).toString()).toBe('%PDF');
  });

  it('rejects disallowed file types and spoofed content', async () => {
    const { auth } = await registerOrg('Bad Upload Co');
    await request(getApp())
      .post('/api/datasets/preview')
      .set(auth)
      .attach('file', Buffer.from('<script>alert(1)</script>'), { filename: 'evil.html', contentType: 'text/html' })
      .expect(415);
    await request(getApp())
      .post('/api/datasets/preview')
      .set(auth)
      .attach('file', Buffer.from('not a zip'), {
        filename: 'fake.xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      .expect(415);
  });

  it('prevents IDOR: another organization cannot read a dataset', async () => {
    const a = await registerOrg('Org A');
    const b = await registerOrg('Org B');
    const imp = await request(getApp())
      .post('/api/datasets')
      .set(a.auth)
      .field('name', 'Private')
      .field('mapping', JSON.stringify({ date: 'Order Date', product: 'Product Name', total: 'Line Total' }))
      .attach('file', Buffer.from(CSV), { filename: 'sales.csv', contentType: 'text/csv' })
      .expect(201);
    await request(getApp()).get(`/api/datasets/${imp.body.dataset.id}/analytics`).set(b.auth).expect(404);
  });
});
