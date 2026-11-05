import type { Analytics } from './schemas/dataset';
import type { InvoiceDto, InvoiceListItemDto } from './schemas/invoice';

/**
 * Exchange rates used to show every amount in the user's chosen display currency.
 *
 * Rates are "units of currency per 1 USD" (base USD). The bundled table below is a
 * snapshot and is used whenever live rates are unavailable; the server can refresh it
 * from a free, key-less API (see apps/server/src/lib/fx.ts). Converted amounts are
 * APPROXIMATE and meant for reporting, not for accounting or settlement.
 */
export type FxRates = Record<string, number>;

/** Date of the bundled snapshot (source: open.er-api.com, base USD). */
export const STATIC_FX_AS_OF = '2026-11-05';

export const STATIC_USD_RATES: FxRates = {
  BDT: 124.454,
  USD: 1.0,
  EUR: 0.889912,
  GBP: 0.742316,
  INR: 94.6202,
  AED: 3.6725,
  SAR: 3.75,
  MYR: 4.06471,
  SGD: 1.27882,
  CAD: 1.39672,
  AUD: 1.42765,
  JPY: 158.378,
  CNY: 6.68542,
  CHF: 0.817009,
  NZD: 1.77749,
  HKD: 7.84534,
  PKR: 276.621,
  NPR: 151.395,
  LKR: 332.161,
  IDR: 18132.2,
  PHP: 63.4789,
  THB: 33.6384,
  VND: 25701.4,
  KRW: 1340.31,
  QAR: 3.64,
  KWD: 0.310148,
  BHD: 0.376,
  OMR: 0.384497,
  EGP: 54.7694,
  TRY: 50.0322,
  NGN: 1346.47,
  KES: 129.872,
  ZAR: 16.4235,
  GHS: 11.6907,
  MAD: 9.77522,
  BRL: 5.46865,
  MXN: 18.6233,
  ARS: 1548.49,
  COP: 3245.02,
  CLP: 980.908,
  SEK: 9.73732,
  NOK: 9.28533,
  DKK: 6.64293,
  PLN: 3.90965,
  RUB: 81.7465,
  UAH: 45.5468,
  ILS: 3.15721,
  CZK: 21.6094,
  HUF: 322.854,
  RON: 4.75048,
  TWD: 32.8241,
  PEN: 3.44935,
  ETB: 162.049,
  TZS: 2648.06,
  UGX: 4068.44,
  MMK: 2100.35,
  KHR: 4088.09,
  JOD: 0.709,
  DZD: 136.029,
  KZT: 452.103,
};

export interface FxTable {
  base: 'USD';
  rates: FxRates;
  /** 'live' when refreshed from the rates API, 'static' for the bundled snapshot. */
  source: 'live' | 'static';
  /** ISO date (YYYY-MM-DD) the rates were published. */
  asOf: string;
}

export const STATIC_FX_TABLE: FxTable = {
  base: 'USD',
  rates: STATIC_USD_RATES,
  source: 'static',
  asOf: STATIC_FX_AS_OF,
};

const rateOf = (code: string, rates: FxRates): number | undefined => {
  const r = rates[code] ?? STATIC_USD_RATES[code];
  return typeof r === 'number' && Number.isFinite(r) && r > 0 ? r : undefined;
};

/** True when both currencies have a known rate (or are the same). */
export function canConvert(from: string, to: string, rates: FxRates = STATIC_USD_RATES): boolean {
  return from === to || (rateOf(from, rates) !== undefined && rateOf(to, rates) !== undefined);
}

/** How many `to` units one `from` unit is worth (1 when unknown or identical). */
export function fxRate(from: string, to: string, rates: FxRates = STATIC_USD_RATES): number {
  if (from === to) return 1;
  const rf = rateOf(from, rates);
  const rt = rateOf(to, rates);
  if (rf === undefined || rt === undefined) return 1;
  return rt / rf;
}

/**
 * Converts an amount between currencies through USD. Unknown currencies are returned
 * unchanged (callers should then keep the source currency label — see `displayCurrencyFor`).
 * The result is not rounded; formatting rounds to the target currency's decimals.
 */
export function convertAmount(amount: number, from: string, to: string, rates: FxRates = STATIC_USD_RATES): number {
  if (!Number.isFinite(amount) || from === to) return amount;
  return amount * fxRate(from, to, rates);
}

/** The currency an amount will actually be shown in: the display currency when convertible, else the source. */
export function displayCurrencyFor(from: string, to: string | undefined | null, rates: FxRates = STATIC_USD_RATES) {
  return to && canConvert(from, to, rates) ? to : from;
}

/** Merges a (possibly partial or untrusted) rates object over the bundled table, keeping only sane values. */
export function mergeFxRates(live: Record<string, unknown> | null | undefined): FxRates {
  const out: FxRates = { ...STATIC_USD_RATES };
  if (!live) return out;
  for (const [code, v] of Object.entries(live)) {
    if (/^[A-Z]{3}$/.test(code) && typeof v === 'number' && Number.isFinite(v) && v > 0) out[code] = v;
  }
  out.USD = 1;
  return out;
}

/** Returns a copy of the analytics with every money field converted to `to`. Counts and % are unchanged. */
export function convertAnalytics(a: Analytics, to: string, rates: FxRates = STATIC_USD_RATES): Analytics {
  const target = displayCurrencyFor(a.currency, to, rates);
  if (target === a.currency) return a;
  const k = fxRate(a.currency, target, rates);
  const m = (n: number) => n * k;
  return {
    ...a,
    currency: target,
    totalRevenue: m(a.totalRevenue),
    averageOrderValue: m(a.averageOrderValue),
    bestProductByRevenue: a.bestProductByRevenue && {
      ...a.bestProductByRevenue,
      revenue: m(a.bestProductByRevenue.revenue),
    },
    bestProductByQuantity: a.bestProductByQuantity && {
      ...a.bestProductByQuantity,
      revenue: m(a.bestProductByQuantity.revenue),
    },
    topProducts: a.topProducts.map((p) => ({ ...p, revenue: m(p.revenue) })),
    topCustomers: a.topCustomers.map((c) => ({ ...c, revenue: m(c.revenue) })),
    byWeekday: a.byWeekday.map((d) => ({ ...d, revenue: m(d.revenue) })),
    bestWeekday: a.bestWeekday && { ...a.bestWeekday, revenue: m(a.bestWeekday.revenue) },
    bestDate: a.bestDate && { ...a.bestDate, revenue: m(a.bestDate.revenue) },
    daily: a.daily.map((d) => ({ ...d, revenue: m(d.revenue) })),
    monthly: a.monthly.map((d) => ({ ...d, revenue: m(d.revenue) })),
  };
}

/** Converts an invoice's amounts to `to`. `originalCurrency` keeps the invoice's own currency. */
export function convertInvoice<T extends InvoiceListItemDto | InvoiceDto>(
  inv: T,
  to: string,
  rates: FxRates = STATIC_USD_RATES,
): T & { originalCurrency: string; fxRate: number } {
  const target = displayCurrencyFor(inv.currency, to, rates);
  const k = fxRate(inv.currency, target, rates);
  const m = (n: number) => n * k;
  const base = {
    ...inv,
    currency: target,
    originalCurrency: inv.currency,
    fxRate: k,
    discountValue: inv.discountType === 'fixed' ? m(inv.discountValue) : inv.discountValue,
    subtotal: m(inv.subtotal),
    discountTotal: m(inv.discountTotal),
    taxTotal: m(inv.taxTotal),
    total: m(inv.total),
  };
  if ('items' in inv) {
    return {
      ...base,
      items: inv.items.map((it) => ({ ...it, unitPrice: m(it.unitPrice), lineTotal: m(it.lineTotal) })),
    } as unknown as T & { originalCurrency: string; fxRate: number };
  }
  return base as T & { originalCurrency: string; fxRate: number };
}
