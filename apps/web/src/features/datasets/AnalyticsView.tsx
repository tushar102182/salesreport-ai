import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Award, CalendarDays, CalendarHeart, Package, ShoppingCart, TrendingUp, Wallet, Receipt } from 'lucide-react';
import type { Analytics } from '@salesreport/shared';
import { Card, CardHeader, StatCard } from '../../components/ui';
import { DailySalesChart, MonthlySalesChart, TopProductsChart, WeekdayChart } from '../../components/charts/Charts';
import { useFormat } from '../../lib/format';
import { cn } from '../../lib/cn';

export function KpiGrid({ a }: { a: Analytics }) {
  const { t } = useTranslation();
  const f = useFormat();
  const g = a.monthOverMonthGrowth;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label={t('dashboard.totalRevenue')}
        value={f.money(a.totalRevenue, a.currency)}
        sub={t('analytics.productsCount', { n: f.number(a.uniqueProducts) })}
        icon={<Wallet className="size-4" />}
      />
      <StatCard
        label={t('dashboard.orders')}
        value={f.number(a.orderCount)}
        sub={a.uniqueCustomers ? t('analytics.customersCount', { n: f.number(a.uniqueCustomers) }) : undefined}
        icon={<ShoppingCart className="size-4" />}
        tone="cyan"
      />
      <StatCard
        label={t('dashboard.aov')}
        value={f.money(a.averageOrderValue, a.currency)}
        icon={<Receipt className="size-4" />}
        tone="violet"
      />
      <StatCard
        label={t('dashboard.growth')}
        value={f.percent(g)}
        trend={g === null ? null : g >= 0 ? 'up' : 'down'}
        sub={
          a.growthMonths
            ? t('dashboard.vsPrev', {
                current: f.month(a.growthMonths.current),
                previous: f.month(a.growthMonths.previous),
              })
            : undefined
        }
        icon={<TrendingUp className="size-4" />}
        tone="emerald"
      />
      <StatCard
        label={t('dashboard.bestProduct')}
        value={<span className="text-lg">{a.bestProductByRevenue?.product ?? '—'}</span>}
        sub={a.bestProductByRevenue ? f.money(a.bestProductByRevenue.revenue, a.currency) : undefined}
        icon={<Award className="size-4" />}
        tone="amber"
      />
      <StatCard
        label={t('dashboard.unitsSold')}
        value={f.number(a.totalQuantity)}
        sub={a.bestProductByQuantity ? `${t('dashboard.byQuantity')}: ${a.bestProductByQuantity.product}` : undefined}
        icon={<Package className="size-4" />}
        tone="rose"
      />
      <StatCard
        label={t('dashboard.bestDay')}
        value={a.bestWeekday ? f.weekday(a.bestWeekday.weekday) : '—'}
        sub={a.bestWeekday ? f.money(a.bestWeekday.revenue, a.currency) : undefined}
        icon={<CalendarDays className="size-4" />}
        tone="cyan"
      />
      <StatCard
        label={t('dashboard.bestDate')}
        value={a.bestDate ? f.date(a.bestDate.date) : '—'}
        sub={a.bestDate ? f.money(a.bestDate.revenue, a.currency) : undefined}
        icon={<CalendarHeart className="size-4" />}
        tone="violet"
      />
    </div>
  );
}

export function ChartsGrid({ a }: { a: Analytics }) {
  const { t } = useTranslation();
  const [metric, setMetric] = useState<'revenue' | 'quantity'>('revenue');
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader title={t('dashboard.dailySales')} />
        <div className="p-4">
          <DailySalesChart data={a.daily} currency={a.currency} />
        </div>
      </Card>
      <Card>
        <CardHeader title={t('dashboard.monthlySales')} />
        <div className="p-4">
          <MonthlySalesChart data={a.monthly} currency={a.currency} />
        </div>
      </Card>
      <Card>
        <CardHeader
          title={t('dashboard.topProducts')}
          action={
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs dark:bg-slate-800">
              {(['revenue', 'quantity'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={cn(
                    'rounded-md px-2.5 py-1 font-medium',
                    metric === m
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                      : 'text-slate-500',
                  )}
                >
                  {t(m === 'revenue' ? 'dashboard.byRevenue' : 'dashboard.byQuantity')}
                </button>
              ))}
            </div>
          }
        />
        <div className="p-4">
          <TopProductsChart data={a.topProducts} currency={a.currency} metric={metric} />
        </div>
      </Card>
      <Card>
        <CardHeader title={t('dashboard.weekday')} />
        <div className="p-4">
          <WeekdayChart data={a.byWeekday} currency={a.currency} />
        </div>
      </Card>
    </div>
  );
}

export function TopTables({ a }: { a: Analytics }) {
  const { t } = useTranslation();
  const f = useFormat();
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <Card className="overflow-hidden xl:col-span-2">
        <CardHeader title={t('dashboard.topProducts')} />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/60">
              <tr>
                <th className="table-th w-10">#</th>
                <th className="table-th">{t('invoices.product')}</th>
                <th className="table-th text-right">{t('analytics.quantity')}</th>
                <th className="table-th text-right">{t('analytics.revenue')}</th>
                <th className="table-th w-40">{t('analytics.share')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {a.topProducts.map((p, i) => (
                <tr key={p.product}>
                  <td className="table-td font-semibold text-slate-400">{f.number(i + 1)}</td>
                  <td className="table-td font-medium text-slate-900 dark:text-white">{p.product}</td>
                  <td className="table-td text-right">{f.number(p.quantity)}</td>
                  <td className="table-td text-right font-semibold">{f.money(p.revenue, a.currency)}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-brand-500"
                          style={{ width: `${Math.min(100, p.share)}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-xs text-slate-500">{f.number(p.share, 1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card className="overflow-hidden">
        <CardHeader title={t('analytics.topCustomers')} />
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {a.topCustomers.slice(0, 8).map((c, i) => (
            <li key={c.customer} className="flex items-center gap-3 px-5 py-3">
              <span className="flex size-7 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                {f.number(i + 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{c.customer}</p>
                <p className="text-xs text-slate-500">
                  {f.number(c.orders)} {t('analytics.orders')}
                </p>
              </div>
              <span className="text-sm font-semibold">{f.money(c.revenue, a.currency)}</span>
            </li>
          ))}
          {!a.topCustomers.length && <li className="px-5 py-6 text-sm text-slate-500">—</li>}
        </ul>
      </Card>
    </div>
  );
}
