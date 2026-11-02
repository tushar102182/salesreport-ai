import { describe, expect, it } from 'vitest';
import { computeAnalytics } from '../src/modules/datasets/analytics.service';
import { generateRuleBasedSummary } from '../src/modules/ai/ruleBased';
import { extractJson } from '../src/modules/ai/summary.service';

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const records = [
  { date: d('2026-01-02'), product: 'Rice', quantity: 2, total: 4000, customer: 'A' }, // Fri
  { date: d('2026-01-02'), product: 'Oil', quantity: 5, total: 1000, customer: 'B' },
  { date: d('2026-01-10'), product: 'Tea', quantity: 10, total: 500, customer: 'A' }, // Sat
  { date: d('2026-02-06'), product: 'Rice', quantity: 3, total: 6000, customer: 'C' }, // Fri
  { date: d('2026-02-28'), product: 'Oil', quantity: 1, total: 200, customer: 'B' },
];

describe('computeAnalytics', () => {
  const a = computeAnalytics(records, 'BDT');

  it('computes KPIs', () => {
    expect(a.totalRevenue).toBe(11700);
    expect(a.orderCount).toBe(5);
    expect(a.averageOrderValue).toBe(2340);
    expect(a.totalQuantity).toBe(21);
    expect(a.uniqueCustomers).toBe(3);
  });

  it('finds best products by revenue and by quantity', () => {
    expect(a.bestProductByRevenue?.product).toBe('Rice');
    expect(a.bestProductByRevenue?.revenue).toBe(10000);
    expect(a.bestProductByQuantity?.product).toBe('Tea');
  });

  it('finds best weekday and best date', () => {
    expect(a.bestWeekday?.weekday).toBe(5); // Friday
    expect(a.bestDate).toEqual({ date: '2026-02-06', revenue: 6000 });
  });

  it('builds a continuous daily series and monthly totals with growth', () => {
    expect(a.daily[0]!.date).toBe('2026-01-02');
    expect(a.daily.at(-1)!.date).toBe('2026-02-28');
    expect(a.daily).toHaveLength(58);
    expect(a.monthly).toEqual([
      { month: '2026-01', revenue: 5500, orders: 3, quantity: 17 },
      { month: '2026-02', revenue: 6200, orders: 2, quantity: 4 },
    ]);
    expect(a.monthOverMonthGrowth).toBe(12.73);
  });

  it('handles empty input', () => {
    const e = computeAnalytics([], 'USD');
    expect(e.totalRevenue).toBe(0);
    expect(e.bestProductByRevenue).toBeNull();
    expect(e.daily).toEqual([]);
  });
});

describe('summaries', () => {
  it('rule-based summary works in English and Bangla', () => {
    const a = computeAnalytics(records, 'BDT');
    const en = generateRuleBasedSummary(a, 'en');
    const bn = generateRuleBasedSummary(a, 'bn');
    expect(en.headline).toContain('৳11,700.00');
    expect(en.insights.join(' ')).toContain('Rice');
    expect(bn.headline).toContain('৳১১,৭০০.০০');
    expect(bn.recommendations.length).toBeGreaterThan(2);
  });

  it('extracts JSON from fenced LLM output', () => {
    expect(extractJson('Sure!\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('{"b":2}')).toEqual({ b: 2 });
  });
});
