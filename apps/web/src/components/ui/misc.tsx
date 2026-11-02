import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Inbox, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';
import { useFormat } from '../../lib/format';
import { Button } from './Button';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-5 animate-spin text-brand-600', className)} aria-label="Loading" />;
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner className="size-7" />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-slate-200/70 dark:bg-slate-800', className)} />;
}

export function EmptyState({
  title,
  hint,
  action,
  icon,
}: {
  title: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
        {icon ?? <Inbox className="size-6" />}
      </div>
      <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
      {hint && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (p: number) => void;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  if (total === 0) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm dark:border-slate-800">
      <span className="text-slate-500 dark:text-slate-400">{t('common.showing', { n: f.number(total) })}</span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label={t('common.previous')}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-slate-600 dark:text-slate-300">
          {t('common.page', { page: f.number(page), total: f.number(totalPages) })}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label={t('common.next')}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = 'brand',
  trend,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  tone?: 'brand' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet';
  trend?: 'up' | 'down' | null;
}) {
  const toneCls = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300',
    cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300',
  }[tone];
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        {icon && (
          <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', toneCls)}>{icon}</div>
        )}
      </div>
      <p
        className={cn(
          'mt-2 truncate text-2xl font-bold tracking-tight text-slate-900 dark:text-white',
          trend === 'up' && 'text-emerald-600 dark:text-emerald-400',
          trend === 'down' && 'text-red-600 dark:text-red-400',
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
    </div>
  );
}
