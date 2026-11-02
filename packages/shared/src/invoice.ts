import type { DiscountType } from './constants';
import { roundMoney } from './format';

export interface InvoiceTotalsInput {
  items: { quantity: number; unitPrice: number }[];
  taxRate: number;
  discountType: DiscountType;
  discountValue: number;
}

export interface InvoiceTotals {
  lineTotals: number[];
  subtotal: number;
  discountTotal: number;
  taxableAmount: number;
  taxTotal: number;
  total: number;
}

const toMinor = (v: number) => Math.round(roundMoney(v, 2) * 100);

/**
 * Computes invoice totals using integer minor units (paisa / cents) so that
 * results are exact and identical on server and client.
 *
 * Order of operations: line totals → subtotal → discount (fixed or %) → tax on
 * the discounted amount → grand total. Discount is capped at the subtotal.
 */
export function computeInvoiceTotals(input: InvoiceTotalsInput): InvoiceTotals {
  const lineMinor = input.items.map((it) =>
    Math.round(toMinor(it.unitPrice) * (Number.isFinite(it.quantity) ? it.quantity : 0)),
  );
  const subtotalMinor = lineMinor.reduce((a, b) => a + b, 0);

  let discountMinor =
    input.discountType === 'percent'
      ? Math.round((subtotalMinor * Math.min(Math.max(input.discountValue, 0), 100)) / 100)
      : toMinor(Math.max(input.discountValue, 0));
  discountMinor = Math.min(discountMinor, subtotalMinor);

  const taxableMinor = subtotalMinor - discountMinor;
  const taxMinor = Math.round((taxableMinor * Math.max(input.taxRate, 0)) / 100);

  return {
    lineTotals: lineMinor.map((m) => m / 100),
    subtotal: subtotalMinor / 100,
    discountTotal: discountMinor / 100,
    taxableAmount: taxableMinor / 100,
    taxTotal: taxMinor / 100,
    total: (taxableMinor + taxMinor) / 100,
  };
}

/** Formats an invoice number like "INV-000042". */
export function formatInvoiceNumber(prefix: string, sequence: number, pad = 6): string {
  return `${prefix}${String(sequence).padStart(pad, '0')}`;
}
