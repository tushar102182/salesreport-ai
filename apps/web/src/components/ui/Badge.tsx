import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { InvoiceStatus } from '@salesreport/shared';
import { cn } from '../../lib/cn';

const tones = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/30',
  green:
    'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
  red: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30',
};

export function Badge({
  tone = 'slate',
  children,
  className,
}: {
  tone?: keyof typeof tones;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const STATUS_TONE: Record<InvoiceStatus, keyof typeof tones> = {
  draft: 'slate',
  sent: 'brand',
  paid: 'green',
  overdue: 'red',
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  const { t } = useTranslation();
  return (
    <Badge tone={STATUS_TONE[status]}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {t(`status.${status}`)}
    </Badge>
  );
}
