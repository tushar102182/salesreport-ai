import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Download, FileText, Plus, Search } from 'lucide-react';
import { INVOICE_STATUSES, type InvoiceListItemDto, type InvoiceStatus, type Paginated } from '@salesreport/shared';
import { api, downloadFile } from '../../lib/api';
import { qk } from '../../lib/queries';
import { useFormat } from '../../lib/format';
import { useDebounced } from '../../lib/useDebounced';
import { cn } from '../../lib/cn';
import { Button, Card, EmptyState, Pagination, PageHeader, Skeleton, StatusBadge } from '../../components/ui';

export function InvoicesPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const nav = useNavigate();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<InvoiceStatus | ''>('');
  const dq = useDebounced(q);
  const params = { page, q: dq, status, pageSize: 15 };
  const { data, isLoading } = useQuery({
    queryKey: qk.invoices(params),
    queryFn: () => api<Paginated<InvoiceListItemDto>>('/invoices', { query: params }),
    placeholderData: keepPreviousData,
  });

  return (
    <div>
      <PageHeader
        title={t('invoices.title')}
        subtitle={t('invoices.subtitle')}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => void downloadFile('/invoices/export.csv', 'invoices.csv', { status, q: dq })}
            >
              <Download className="size-4" /> {t('common.export')}
            </Button>
            <Link to="/invoices/new">
              <Button>
                <Plus className="size-4" /> {t('invoices.new')}
              </Button>
            </Link>
          </>
        }
      />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between dark:border-slate-800">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder={t('common.search')}
              value={q}
              onChange={(e) => (setQ(e.target.value), setPage(1))}
              aria-label={t('common.search')}
            />
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('invoices.status')}>
            {(['', ...INVOICE_STATUSES] as const).map((s) => (
              <button
                key={s || 'all'}
                onClick={() => (setStatus(s), setPage(1))}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  status === s
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300',
                )}
              >
                {s ? t(`status.${s}`) : t('invoices.allStatuses')}
              </button>
            ))}
          </div>
        </div>
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState
            icon={<FileText className="size-6" />}
            title={t('invoices.empty')}
            hint={t('invoices.emptyHint')}
            action={
              <Link to="/invoices/new">
                <Button>{t('invoices.new')}</Button>
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900/60">
                <tr>
                  <th className="table-th">{t('invoices.number')}</th>
                  <th className="table-th">{t('invoices.customer')}</th>
                  <th className="table-th">{t('invoices.issueDate')}</th>
                  <th className="table-th">{t('invoices.dueDate')}</th>
                  <th className="table-th">{t('invoices.status')}</th>
                  <th className="table-th text-right">{t('invoices.total')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.items.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => nav(`/invoices/${inv.id}`)}
                    className="cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-900/40"
                  >
                    <td className="table-td font-medium text-slate-900 dark:text-white">
                      <Link
                        to={`/invoices/${inv.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:text-brand-600"
                      >
                        {inv.number}
                      </Link>
                    </td>
                    <td className="table-td">{inv.customer.name}</td>
                    <td className="table-td whitespace-nowrap">{f.date(inv.issueDate)}</td>
                    <td className="table-td whitespace-nowrap">{f.date(inv.dueDate)}</td>
                    <td className="table-td">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="table-td text-right font-semibold whitespace-nowrap">
                      {f.money(inv.total, inv.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} />}
      </Card>
    </div>
  );
}
