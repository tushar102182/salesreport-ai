import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Analytics } from '@salesreport/shared';
import { useFormat } from '../../lib/format';

const BRAND = '#4f46e5';
const SOFT = '#a5b4fc';
const PALETTE = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

interface TipProps {
  active?: boolean;
  payload?: { value: number; payload: Record<string, unknown> }[];
  label?: string;
  format: (v: number) => string;
  labelFormat?: (l: string) => string;
}
function ChartTooltip({ active, payload, label, format, labelFormat }: TipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="font-medium text-slate-500 dark:text-slate-400">
        {labelFormat ? labelFormat(String(label)) : label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">{format(payload[0]!.value)}</p>
    </div>
  );
}

export function DailySalesChart({ data, currency }: { data: Analytics['daily']; currency: string }) {
  const f = useFormat();
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="dailyFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND} stopOpacity={0.3} />
            <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          minTickGap={40}
          tickFormatter={(d: string) => f.date(d).replace(/\s\S+$/, '')}
        />
        <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => f.compact(v, currency)} />
        <Tooltip content={<ChartTooltip format={(v) => f.money(v, currency)} labelFormat={(l) => f.date(l)} />} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke={BRAND}
          strokeWidth={2}
          fill="url(#dailyFill)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MonthlySalesChart({ data, currency }: { data: Analytics['monthly']; currency: string }) {
  const f = useFormat();
  const max = Math.max(...data.map((d) => d.revenue));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickFormatter={(m: string) => f.month(m)} />
        <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => f.compact(v, currency)} />
        <Tooltip
          cursor={{ fill: 'rgba(99,102,241,0.08)' }}
          content={<ChartTooltip format={(v) => f.money(v, currency)} labelFormat={(l) => f.month(l, true)} />}
        />
        <Bar dataKey="revenue" radius={[8, 8, 0, 0]} maxBarSize={56}>
          {data.map((d) => (
            <Cell key={d.month} fill={d.revenue === max ? BRAND : SOFT} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TopProductsChart({
  data,
  currency,
  metric,
}: {
  data: Analytics['topProducts'];
  currency: string;
  metric: 'revenue' | 'quantity';
}) {
  const f = useFormat();
  const rows = [...data].sort((a, b) => b[metric] - a[metric]).slice(0, 8);
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, rows.length * 38)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="product"
          width={150}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12 }}
          tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)}
        />
        <Tooltip
          cursor={{ fill: 'rgba(99,102,241,0.06)' }}
          content={<ChartTooltip format={(v) => (metric === 'revenue' ? f.money(v, currency) : f.number(v))} />}
        />
        <Bar dataKey={metric} radius={[0, 8, 8, 0]} barSize={18}>
          {rows.map((r, i) => (
            <Cell key={r.product} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function WeekdayChart({ data, currency }: { data: Analytics['byWeekday']; currency: string }) {
  const f = useFormat();
  // Saturday-first, as the working week starts on Saturday in Bangladesh.
  const order = [6, 0, 1, 2, 3, 4, 5].map((i) => data[i]!).filter(Boolean);
  const max = Math.max(...order.map((d) => d.revenue));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={order} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="weekday"
          tickLine={false}
          axisLine={false}
          tickFormatter={(w: number) => f.weekday(w).slice(0, f.lang === 'bn' ? 4 : 3)}
        />
        <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => f.compact(v, currency)} />
        <Tooltip
          cursor={{ fill: 'rgba(99,102,241,0.08)' }}
          content={<ChartTooltip format={(v) => f.money(v, currency)} labelFormat={(l) => f.weekday(Number(l))} />}
        />
        <Bar dataKey="revenue" radius={[8, 8, 0, 0]} maxBarSize={40}>
          {order.map((d) => (
            <Cell key={d.weekday} fill={d.revenue === max ? '#06b6d4' : '#a5f3fc'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
