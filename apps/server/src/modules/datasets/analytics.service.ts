import type { Analytics, ProductStat } from '@salesreport/shared';
import { roundMoney } from '@salesreport/shared';

export interface AnalyticsRecord {
  date: Date;
  product: string;
  quantity: number;
  total: number;
  customer: string | null;
}

const r2 = (n: number) => roundMoney(n, 2);
const growth = (curr: number, prev: number) => (prev > 0 ? r2(((curr - prev) / prev) * 100) : null);

/**
 * Pure analytics over sales records. Each record is treated as one order line.
 * All dates are UTC calendar days.
 */
export function computeAnalytics(records: AnalyticsRecord[], currency: string): Analytics {
  const byProduct = new Map<string, { revenue: number; quantity: number; orders: number }>();
  const byCustomer = new Map<string, { revenue: number; orders: number }>();
  const byDay = new Map<string, { revenue: number; orders: number }>();
  const byMonth = new Map<string, { revenue: number; orders: number; quantity: number }>();
  const weekday = Array.from({ length: 7 }, (_, i) => ({ weekday: i, revenue: 0, orders: 0 }));

  let totalRevenue = 0;
  let totalQuantity = 0;
  let minT = Infinity;
  let maxT = -Infinity;

  for (const rec of records) {
    totalRevenue += rec.total;
    totalQuantity += rec.quantity;
    const t = rec.date.getTime();
    if (t < minT) minT = t;
    if (t > maxT) maxT = t;
    const day = rec.date.toISOString().slice(0, 10);
    const month = day.slice(0, 7);

    const p = byProduct.get(rec.product) ?? { revenue: 0, quantity: 0, orders: 0 };
    p.revenue += rec.total;
    p.quantity += rec.quantity;
    p.orders += 1;
    byProduct.set(rec.product, p);

    if (rec.customer) {
      const c = byCustomer.get(rec.customer) ?? { revenue: 0, orders: 0 };
      c.revenue += rec.total;
      c.orders += 1;
      byCustomer.set(rec.customer, c);
    }

    const d = byDay.get(day) ?? { revenue: 0, orders: 0 };
    d.revenue += rec.total;
    d.orders += 1;
    byDay.set(day, d);

    const m = byMonth.get(month) ?? { revenue: 0, orders: 0, quantity: 0 };
    m.revenue += rec.total;
    m.orders += 1;
    m.quantity += rec.quantity;
    byMonth.set(month, m);

    const w = weekday[rec.date.getUTCDay()]!;
    w.revenue += rec.total;
    w.orders += 1;
  }

  const products: ProductStat[] = [...byProduct.entries()].map(([product, v]) => ({
    product,
    revenue: r2(v.revenue),
    quantity: roundMoney(v.quantity, 2),
    orders: v.orders,
    share: totalRevenue > 0 ? r2((v.revenue / totalRevenue) * 100) : 0,
  }));
  const byRevenue = [...products].sort((a, b) => b.revenue - a.revenue);
  const byQty = [...products].sort((a, b) => b.quantity - a.quantity);

  // Fill gaps so the daily chart has a continuous axis.
  const daily: Analytics['daily'] = [];
  if (records.length) {
    for (let t = minT; t <= maxT; t += 86_400_000) {
      const key = new Date(t).toISOString().slice(0, 10);
      const v = byDay.get(key);
      daily.push({ date: key, revenue: r2(v?.revenue ?? 0), orders: v?.orders ?? 0 });
    }
  }
  const monthly = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, revenue: r2(v.revenue), orders: v.orders, quantity: roundMoney(v.quantity, 2) }));

  const bestDay = [...byDay.entries()].sort((a, b) => b[1].revenue - a[1].revenue)[0];
  const bestWeekday = [...weekday].sort((a, b) => b.revenue - a.revenue)[0];

  // Month-over-month growth compares the latest *complete* month with the one before it,
  // so a partial current month (e.g. 2 days of November) doesn't show a false drop.
  let lastIdx = monthly.length - 1;
  if (records.length && lastIdx >= 2) {
    const end = new Date(maxT);
    const daysInMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
    if (end.getUTCDate() < daysInMonth) lastIdx -= 1;
  }
  const last = monthly[lastIdx];
  const prev = monthly[lastIdx - 1];
  const half = Math.floor(daily.length / 2);
  const firstHalf = daily.slice(0, half).reduce((s, d) => s + d.revenue, 0);
  const secondHalf = daily.slice(daily.length - half).reduce((s, d) => s + d.revenue, 0);

  return {
    currency,
    totalRevenue: r2(totalRevenue),
    totalQuantity: roundMoney(totalQuantity, 2),
    orderCount: records.length,
    averageOrderValue: records.length ? r2(totalRevenue / records.length) : 0,
    uniqueProducts: byProduct.size,
    uniqueCustomers: byCustomer.size,
    periodStart: records.length ? new Date(minT).toISOString().slice(0, 10) : null,
    periodEnd: records.length ? new Date(maxT).toISOString().slice(0, 10) : null,
    bestProductByRevenue: byRevenue[0] ?? null,
    bestProductByQuantity: byQty[0] ?? null,
    topProducts: byRevenue.slice(0, 10),
    topCustomers: [...byCustomer.entries()]
      .map(([customer, v]) => ({ customer, revenue: r2(v.revenue), orders: v.orders }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10),
    byWeekday: weekday.map((w) => ({ ...w, revenue: r2(w.revenue) })),
    bestWeekday:
      bestWeekday && bestWeekday.orders > 0 ? { weekday: bestWeekday.weekday, revenue: r2(bestWeekday.revenue) } : null,
    bestDate: bestDay ? { date: bestDay[0], revenue: r2(bestDay[1].revenue) } : null,
    daily,
    monthly,
    monthOverMonthGrowth: last && prev ? growth(last.revenue, prev.revenue) : null,
    growthMonths: last && prev ? { current: last.month, previous: prev.month } : null,
    periodGrowth: half > 0 ? growth(secondHalf, firstHalf) : null,
  };
}
