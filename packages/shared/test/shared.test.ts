import { describe, expect, it } from 'vitest';
import {
  autoDetectMapping,
  computeInvoiceTotals,
  formatInvoiceNumber,
  formatMoney,
  passwordSchema,
  toBanglaDigits,
} from '../src';

describe('computeInvoiceTotals', () => {
  it('computes subtotal, percent discount, tax and total exactly', () => {
    const t = computeInvoiceTotals({
      items: [
        { quantity: 3, unitPrice: 0.1 },
        { quantity: 2, unitPrice: 1250.5 },
      ],
      taxRate: 15,
      discountType: 'percent',
      discountValue: 10,
    });
    expect(t.lineTotals).toEqual([0.3, 2501]);
    expect(t.subtotal).toBe(2501.3);
    expect(t.discountTotal).toBe(250.13);
    expect(t.taxTotal).toBe(337.68);
    expect(t.total).toBe(2588.85);
  });

  it('caps a fixed discount at the subtotal', () => {
    const t = computeInvoiceTotals({
      items: [{ quantity: 1, unitPrice: 100 }],
      taxRate: 5,
      discountType: 'fixed',
      discountValue: 500,
    });
    expect(t.discountTotal).toBe(100);
    expect(t.total).toBe(0);
  });

  it('supports fractional quantities', () => {
    const t = computeInvoiceTotals({
      items: [{ quantity: 2.5, unitPrice: 80 }],
      taxRate: 0,
      discountType: 'fixed',
      discountValue: 0,
    });
    expect(t.total).toBe(200);
  });
});

describe('formatting', () => {
  it('formats BDT with lakh grouping and Bangla digits', () => {
    expect(formatMoney(1234567.5, 'BDT', 'en')).toBe('৳12,34,567.50');
    expect(formatMoney(1234567.5, 'BDT', 'bn')).toBe('৳১২,৩৪,৫৬৭.৫০');
    expect(formatMoney(1234567.5, 'USD', 'en')).toBe('$1,234,567.50');
  });
  it('converts digits', () => expect(toBanglaDigits('2026-03')).toBe('২০২৬-০৩'));
  it('pads invoice numbers', () => expect(formatInvoiceNumber('INV-', 42)).toBe('INV-000042'));
});

describe('autoDetectMapping', () => {
  it('detects English headers', () => {
    expect(autoDetectMapping(['Order Date', 'Product Name', 'Qty', 'Unit Price', 'Line Total', 'Customer'])).toEqual({
      date: 'Order Date',
      product: 'Product Name',
      quantity: 'Qty',
      unitPrice: 'Unit Price',
      total: 'Line Total',
      customer: 'Customer',
    });
  });
  it('detects Bangla headers', () => {
    const m = autoDetectMapping(['তারিখ', 'পণ্য', 'পরিমাণ', 'একক মূল্য', 'মোট', 'গ্রাহক']);
    expect(m.date).toBe('তারিখ');
    expect(m.total).toBe('মোট');
    expect(m.customer).toBe('গ্রাহক');
  });
});

describe('passwordSchema', () => {
  it('accepts strong and rejects weak passwords', () => {
    expect(passwordSchema.safeParse('Demo@12345').success).toBe(true);
    expect(passwordSchema.safeParse('password').success).toBe(false);
    expect(passwordSchema.safeParse('Password123').success).toBe(false);
  });
});
