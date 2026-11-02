import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { getApp, registerOrg } from './helpers';

describe('invoices', () => {
  it('computes totals server-side, numbers sequentially, and renders PDFs', async () => {
    const { auth } = await registerOrg('Invoice Co');
    const customer = await request(getApp())
      .post('/api/customers')
      .set(auth)
      .send({ name: 'Rahim Traders', email: 'rahim@example.com' })
      .expect(201);
    const product = await request(getApp())
      .post('/api/products')
      .set(auth)
      .send({ name: 'Rice 25kg', unitPrice: 1950 })
      .expect(201);

    const payload = {
      customerId: customer.body.id,
      issueDate: '2026-03-01',
      dueDate: '2026-03-15',
      taxRate: 5,
      discountType: 'percent',
      discountValue: 10,
      items: [
        { productId: product.body.id, description: 'Rice 25kg', quantity: 2, unitPrice: 1950 },
        { description: 'Delivery', quantity: 1, unitPrice: 150.5 },
      ],
      // client-sent totals must be ignored
      total: 1,
    };
    const inv1 = await request(getApp()).post('/api/invoices').set(auth).send(payload).expect(201);
    expect(inv1.body.subtotal).toBe(4050.5);
    expect(inv1.body.discountTotal).toBe(405.05);
    expect(inv1.body.taxTotal).toBe(182.27);
    expect(inv1.body.total).toBe(3827.72);
    expect(inv1.body.number).toBe('INV-000001');
    expect(inv1.body.currency).toBe('BDT');

    const inv2 = await request(getApp()).post('/api/invoices').set(auth).send(payload).expect(201);
    expect(inv2.body.number).toBe('INV-000002');

    const paid = await request(getApp())
      .patch(`/api/invoices/${inv1.body.id}/status`)
      .set(auth)
      .send({ status: 'paid' })
      .expect(200);
    expect(paid.body.paidAt).toBeTruthy();

    const list = await request(getApp()).get('/api/invoices?status=paid').set(auth).expect(200);
    expect(list.body.total).toBe(1);

    for (const lang of ['en', 'bn']) {
      const pdf = await request(getApp()).get(`/api/invoices/${inv1.body.id}/pdf?lang=${lang}`).set(auth).expect(200);
      expect(pdf.headers['content-type']).toBe('application/pdf');
    }
  });

  it('validates input and rejects due date before issue date', async () => {
    const { auth } = await registerOrg('Invalid Co');
    const res = await request(getApp())
      .post('/api/invoices')
      .set(auth)
      .send({
        customerId: 'abc',
        issueDate: '2026-03-10',
        dueDate: '2026-03-01',
        items: [{ description: 'x', quantity: 1, unitPrice: 1 }],
      })
      .expect(400);
    expect(res.body.error.details.some((d: { path: string }) => d.path === 'dueDate')).toBe(true);
  });

  it('prevents IDOR: cannot reference or read another organization’s records', async () => {
    const a = await registerOrg('A Co');
    const b = await registerOrg('B Co');
    const cust = await request(getApp())
      .post('/api/customers')
      .set(a.auth)
      .send({ name: 'Secret customer' })
      .expect(201);
    await request(getApp()).get(`/api/customers/${cust.body.id}`).set(b.auth).expect(404);
    await request(getApp()).put(`/api/customers/${cust.body.id}`).set(b.auth).send({ name: 'Hacked' }).expect(404);
    await request(getApp())
      .post('/api/invoices')
      .set(b.auth)
      .send({
        customerId: cust.body.id,
        issueDate: '2026-03-01',
        items: [{ description: 'x', quantity: 1, unitPrice: 1 }],
      })
      .expect(400);
  });
});
