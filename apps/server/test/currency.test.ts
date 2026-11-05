import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { STATIC_USD_RATES } from '@salesreport/shared';
import { getApp, registerOrg } from './helpers';

const binary = (res: request.Response, cb: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (c: Buffer) => chunks.push(c));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
};

const CSV = ['Date,Product,Total', '2026-01-05,Rice,12445.4', '2026-01-06,Oil,24890.8'].join('\n');

describe('display currency', () => {
  it('serves the approximate exchange-rate table (bundled in tests)', async () => {
    const res = await request(getApp()).get('/api/config/fx').expect(200);
    expect(res.body.base).toBe('USD');
    expect(res.body.approximate).toBe(true);
    expect(res.body.source).toBe('static');
    expect(res.body.rates.USD).toBe(1);
    expect(res.body.rates.BDT).toBeGreaterThan(1);
  });

  it('converts dashboard invoice totals across currencies to the requested display currency', async () => {
    const { auth } = await registerOrg('FX Co');
    const customer = await request(getApp()).post('/api/customers').set(auth).send({ name: 'Buyer' }).expect(201);
    const base = { customerId: customer.body.id, issueDate: '2026-03-01', taxRate: 0 };
    const bdt = await request(getApp())
      .post('/api/invoices')
      .set(auth)
      .send({ ...base, items: [{ description: 'A', quantity: 1, unitPrice: 12445.4 }] })
      .expect(201);
    const usd = await request(getApp())
      .post('/api/invoices')
      .set(auth)
      .send({ ...base, currency: 'USD', items: [{ description: 'B', quantity: 1, unitPrice: 50 }] })
      .expect(201);
    for (const id of [bdt.body.id, usd.body.id]) {
      await request(getApp()).patch(`/api/invoices/${id}/status`).set(auth).send({ status: 'paid' }).expect(200);
    }

    const inUsd = await request(getApp()).get('/api/dashboard?currency=USD').set(auth).expect(200);
    expect(inUsd.body.currency).toBe('USD');
    const expectedUsd = 12445.4 / STATIC_USD_RATES.BDT! + 50;
    expect(inUsd.body.invoiceTotals.paid.count).toBe(2);
    expect(inUsd.body.invoiceTotals.paid.amount).toBeCloseTo(expectedUsd, 1);

    // The header works too (the web app sends it on every request).
    const inEur = await request(getApp()).get('/api/dashboard').set(auth).set('X-Display-Currency', 'eur').expect(200);
    expect(inEur.body.currency).toBe('EUR');
    expect(inEur.body.invoiceTotals.paid.amount).toBeCloseTo(expectedUsd * STATIC_USD_RATES.EUR!, 1);

    // Default: company currency (BDT) — USD invoice converted, not added raw.
    const inBdt = await request(getApp()).get('/api/dashboard').set(auth).expect(200);
    expect(inBdt.body.currency).toBe('BDT');
    expect(inBdt.body.invoiceTotals.paid.amount).toBeCloseTo(12445.4 + 50 * STATIC_USD_RATES.BDT!, 0);

    // Invalid codes are rejected.
    await request(getApp()).get('/api/dashboard?currency=XXX').set(auth).expect(400);

    // Invoice PDF renders in the display currency.
    const pdf = await request(getApp())
      .get(`/api/invoices/${bdt.body.id}/pdf?lang=en&currency=USD`)
      .set(auth)
      .buffer(true)
      .parse(binary)
      .expect(200);
    expect((pdf.body as Buffer).subarray(0, 4).toString()).toBe('%PDF');
  });

  it('converts analytics, the summary text and the report PDF', async () => {
    const { auth } = await registerOrg('FX Data Co');
    const imported = await request(getApp())
      .post('/api/datasets')
      .set(auth)
      .field('name', 'fx')
      .field('mapping', JSON.stringify({ date: 'Date', product: 'Product', total: 'Total' }))
      .attach('file', Buffer.from(CSV), { filename: 'fx.csv', contentType: 'text/csv' })
      .expect(201);
    const id = imported.body.dataset.id as string;

    const raw = await request(getApp()).get(`/api/datasets/${id}/analytics`).set(auth).expect(200);
    expect(raw.body.currency).toBe('BDT');
    const usd = await request(getApp()).get(`/api/datasets/${id}/analytics?currency=USD`).set(auth).expect(200);
    expect(usd.body.currency).toBe('USD');
    expect(usd.body.totalRevenue).toBeCloseTo(37336.2 / STATIC_USD_RATES.BDT!, 6);
    expect(usd.body.orderCount).toBe(raw.body.orderCount);

    const sUsd = await request(getApp())
      .post(`/api/datasets/${id}/summary`)
      .set(auth)
      .send({ language: 'en', currency: 'USD' })
      .expect(200);
    expect(sUsd.body.summary.currency).toBe('USD');
    expect(sUsd.body.summary.headline).toContain('$');
    expect(sUsd.body.summary.headline).not.toContain('৳');

    const sBdt = await request(getApp())
      .post(`/api/datasets/${id}/summary`)
      .set(auth)
      .send({ language: 'en' })
      .expect(200);
    expect(sBdt.body.summary.headline).toContain('৳');

    // Cached separately per currency.
    const cached = await request(getApp())
      .get(`/api/datasets/${id}/summary?lang=en&currency=USD`)
      .set(auth)
      .expect(200);
    expect(cached.body.summary.headline).toBe(sUsd.body.summary.headline);

    const pdf = await request(getApp())
      .get(`/api/datasets/${id}/report.pdf?lang=en&currency=USD`)
      .set(auth)
      .buffer(true)
      .parse(binary)
      .expect(200);
    expect(pdf.headers['content-type']).toBe('application/pdf');
  });

  it('stores the user display-currency preference', async () => {
    const { auth } = await registerOrg('Pref Co');
    const res = await request(getApp())
      .patch('/api/auth/me/preferences')
      .set(auth)
      .send({ displayCurrency: 'usd' })
      .expect(200);
    expect(res.body.user.displayCurrency).toBe('USD');
    const me = await request(getApp()).get('/api/auth/me').set(auth).expect(200);
    expect(me.body.user.displayCurrency).toBe('USD');
    await request(getApp()).patch('/api/auth/me/preferences').set(auth).send({ displayCurrency: 'XXX' }).expect(400);
    const cleared = await request(getApp())
      .patch('/api/auth/me/preferences')
      .set(auth)
      .send({ displayCurrency: null })
      .expect(200);
    expect(cleared.body.user.displayCurrency).toBeNull();
  });
});
