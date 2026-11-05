import { describe, expect, it } from 'vitest';
import {
  CURRENCY_CODES,
  STATIC_USD_RATES,
  canConvert,
  compactNumber,
  convertAmount,
  convertAnalytics,
  convertInvoice,
  displayCurrencyFor,
  formatMoney,
  formatMoneyIn,
  fxRate,
  mergeFxRates,
  type Analytics,
  type InvoiceDto,
} from '../src';

const rates = { USD: 1, BDT: 120, EUR: 0.9, JPY: 150 };

describe('exchange-rate table', () => {
  it('has a positive rate for every supported currency and USD = 1', () => {
    expect(STATIC_USD_RATES.USD).toBe(1);
    for (const code of CURRENCY_CODES) {
      expect(STATIC_USD_RATES[code], code).toBeGreaterThan(0);
    }
    expect(CURRENCY_CODES.length).toBeGreaterThanOrEqual(60);
  });

  it('merges live rates over the static table and drops junk values', () => {
    const merged = mergeFxRates({ BDT: 130, EUR: -1, usd: 5, XYZ: 'x', USD: 2 });
    expect(merged.BDT).toBe(130);
    expect(merged.EUR).toBe(STATIC_USD_RATES.EUR);
    expect(merged.USD).toBe(1);
    expect(merged.XYZ).toBeUndefined();
    expect(mergeFxRates(null)).toEqual(STATIC_USD_RATES);
  });
});

describe('convertAmount', () => {
  it('converts through USD', () => {
    expect(convertAmount(12_000, 'BDT', 'USD', rates)).toBeCloseTo(100, 10);
    expect(convertAmount(100, 'USD', 'BDT', rates)).toBeCloseTo(12_000, 10);
    expect(convertAmount(1200, 'BDT', 'EUR', rates)).toBeCloseTo(9, 10);
    expect(fxRate('EUR', 'JPY', rates)).toBeCloseTo(150 / 0.9, 10);
  });

  it('is the identity for the same currency and round-trips', () => {
    expect(convertAmount(123.45, 'BDT', 'BDT', rates)).toBe(123.45);
    const back = convertAmount(convertAmount(987.65, 'BDT', 'JPY', rates), 'JPY', 'BDT', rates);
    expect(back).toBeCloseTo(987.65, 8);
  });

  it('leaves amounts unchanged and keeps the source label when a rate is unknown', () => {
    expect(canConvert('BDT', 'ZZZ', rates)).toBe(false);
    expect(convertAmount(50, 'ZZZ', 'USD', rates)).toBe(50);
    expect(displayCurrencyFor('ZZZ', 'USD', rates)).toBe('ZZZ');
    expect(displayCurrencyFor('BDT', 'USD', rates)).toBe('USD');
    expect(displayCurrencyFor('BDT', null, rates)).toBe('BDT');
  });
});

describe('formatMoneyIn', () => {
  it('formats BDT amounts as USD after conversion', () => {
    expect(formatMoneyIn(1_234_567, 'BDT', 'USD', 'en', rates)).toBe('$10,288.06');
    expect(formatMoney(1_234_567, 'BDT', 'en')).toBe('৳12,34,567.00');
  });

  it('respects target decimals and Bangla digits', () => {
    expect(formatMoneyIn(100, 'USD', 'JPY', 'en', rates)).toBe('JPY 15,000');
    expect(formatMoneyIn(1, 'USD', 'BDT', 'bn', rates)).toBe('৳১২০.০০');
  });

  it('compacts converted values with K/M for non-South-Asian currencies', () => {
    expect(compactNumber(convertAmount(24_000_000, 'BDT', 'USD', rates), 'en', 'USD')).toBe('200K');
    expect(compactNumber(24_000_000, 'en', 'BDT')).toBe('2.4Cr');
  });
});

const analytics: Analytics = {
  currency: 'BDT',
  totalRevenue: 12_000,
  totalQuantity: 10,
  orderCount: 4,
  averageOrderValue: 3000,
  uniqueProducts: 2,
  uniqueCustomers: 1,
  periodStart: '2026-01-01',
  periodEnd: '2026-01-31',
  bestProductByRevenue: { product: 'A', revenue: 9000, quantity: 6, orders: 3, share: 75 },
  bestProductByQuantity: { product: 'A', revenue: 9000, quantity: 6, orders: 3, share: 75 },
  topProducts: [{ product: 'A', revenue: 9000, quantity: 6, orders: 3, share: 75 }],
  topCustomers: [{ customer: 'X', revenue: 2400, orders: 1 }],
  byWeekday: [{ weekday: 1, revenue: 1200, orders: 1 }],
  bestWeekday: { weekday: 1, revenue: 1200 },
  bestDate: { date: '2026-01-05', revenue: 6000 },
  daily: [{ date: '2026-01-05', revenue: 6000, orders: 2 }],
  monthly: [{ month: '2026-01', revenue: 12_000, orders: 4, quantity: 10 }],
  monthOverMonthGrowth: 12.5,
  growthMonths: null,
  periodGrowth: -3,
};

describe('convertAnalytics', () => {
  it('converts every money field and keeps counts and percentages', () => {
    const u = convertAnalytics(analytics, 'USD', rates);
    expect(u.currency).toBe('USD');
    expect(u.totalRevenue).toBeCloseTo(100);
    expect(u.averageOrderValue).toBeCloseTo(25);
    expect(u.bestProductByRevenue?.revenue).toBeCloseTo(75);
    expect(u.topProducts[0]?.revenue).toBeCloseTo(75);
    expect(u.topCustomers[0]?.revenue).toBeCloseTo(20);
    expect(u.byWeekday[0]?.revenue).toBeCloseTo(10);
    expect(u.bestDate?.revenue).toBeCloseTo(50);
    expect(u.daily[0]?.revenue).toBeCloseTo(50);
    expect(u.monthly[0]?.revenue).toBeCloseTo(100);
    expect(u.orderCount).toBe(4);
    expect(u.totalQuantity).toBe(10);
    expect(u.monthOverMonthGrowth).toBe(12.5);
    expect(u.topProducts[0]?.share).toBe(75);
  });

  it('returns the same object when no conversion is needed', () => {
    expect(convertAnalytics(analytics, 'BDT', rates)).toBe(analytics);
  });
});

describe('convertInvoice', () => {
  const inv = {
    id: 'i1',
    number: 'INV-1',
    status: 'sent',
    issueDate: '2026-01-01',
    dueDate: null,
    currency: 'BDT',
    language: 'en',
    taxRate: 15,
    discountType: 'fixed',
    discountValue: 120,
    subtotal: 1200,
    discountTotal: 120,
    taxTotal: 162,
    total: 1242,
    notes: null,
    paidAt: null,
    customer: { id: 'c', name: 'C', email: null, phone: null, address: null },
    items: [{ id: 'l', productId: null, description: 'x', quantity: 2, unitPrice: 600, lineTotal: 1200 }],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  } satisfies InvoiceDto;

  it('converts totals and line items and remembers the original currency', () => {
    const u = convertInvoice(inv, 'USD', rates);
    expect(u.currency).toBe('USD');
    expect(u.originalCurrency).toBe('BDT');
    expect(u.total).toBeCloseTo(10.35);
    expect(u.items[0]?.unitPrice).toBeCloseTo(5);
    expect(u.items[0]?.quantity).toBe(2);
    expect(u.discountValue).toBeCloseTo(1);
    expect(u.taxRate).toBe(15);
  });
});
