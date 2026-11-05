import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, BarChart3, CheckCircle2, Clock, AlertOctagon, Upload } from 'lucide-react';
import type { DashboardDto, DatasetDto, Paginated } from '@salesreport/shared';
import { useState } from 'react';
import { api } from '../../lib/api';
import { qk } from '../../lib/queries';
import { useFormat } from '../../lib/format';
import { useAuth } from '../../lib/auth';
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  FullPageSpinner,
  PageHeader,
  Select,
  StatusBadge,
} from '../../components/ui';
import { ChartsGrid, KpiGrid } from '../datasets/AnalyticsView';
import { SummaryCard } from '../datasets/SummaryCard';
import { PdfButtons } from '../datasets/ReportButtons';

export function DashboardPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const { user } = useAuth();
  const [datasetId, setDatasetId] = useState<string | undefined>();
  const { data, isLoading } = useQuery({
    queryKey: qk.dashboard(datasetId, f.currency),
    queryFn: () => api<DashboardDto>('/dashboard', { query: { datasetId, currency: f.currency } }),
  });
  const datasets = useQuery({
    queryKey: qk.datasets({ page: 1, pageSize: 50 }),
    queryFn: () => api<Paginated<DatasetDto>>('/datasets', { query: { page: 1, pageSize: 50 } }),
  });

  if (isLoading || !data) return <FullPageSpinner />;
  const it = data.invoiceTotals;
  const outstanding = it.sent.amount + it.overdue.amount;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${t('dashboard.title')}`}
        subtitle={`${user?.name ? `${user.name} · ` : ''}${t('dashboard.subtitle')}`}
        actions={
          <>
            {datasets.data && datasets.data.items.length > 1 && (
              <Select
                aria-label={t('dashboard.datasetSelect')}
                value={datasetId ?? data.dataset?.id ?? ''}
                onChange={(e) => setDatasetId(e.target.value)}
                wrapperClassName="min-w-56"
              >
                {datasets.data.items.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            )}
            {data.dataset && (
              <PdfButtons path={`/datasets/${data.dataset.id}/report.pdf`} fileBase={data.dataset.name} />
            )}
          </>
        }
      />

      {data.analytics && data.dataset ? (
        <>
          <KpiGrid a={data.analytics} />
          <SummaryCard key={data.dataset.id} datasetId={data.dataset.id} />
          <ChartsGrid a={data.analytics} />
        </>
      ) : (
        <Card>
          <EmptyState
            icon={<BarChart3 className="size-6" />}
            title={t('dashboard.noData')}
            hint={t('dashboard.noDataHint')}
            action={
              <Link to="/upload">
                <Button>
                  <Upload className="size-4" /> {t('nav.upload')}
                </Button>
              </Link>
            }
          />
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader title={t('dashboard.invoicesOverview')} />
          <div className="space-y-3 p-5">
            {[
              { label: t('dashboard.paid'), v: it.paid, icon: <CheckCircle2 className="size-4 text-emerald-500" /> },
              {
                label: t('dashboard.outstanding'),
                v: { count: it.sent.count + it.overdue.count, amount: outstanding },
                icon: <Clock className="size-4 text-brand-500" />,
              },
              { label: t('dashboard.overdue'), v: it.overdue, icon: <AlertOctagon className="size-4 text-red-500" /> },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50"
              >
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  {row.icon} {row.label} <span className="text-xs text-slate-400">({f.number(row.v.count)})</span>
                </div>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {f.money(row.v.amount, data.currency)}
                </span>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3 pt-2 text-center">
              <Link
                to="/customers"
                className="rounded-xl border border-slate-200 p-3 hover:border-brand-300 dark:border-slate-800"
              >
                <p className="text-xl font-bold">{f.number(data.counts.customers)}</p>
                <p className="text-xs text-slate-500">{t('dashboard.customers')}</p>
              </Link>
              <Link
                to="/products"
                className="rounded-xl border border-slate-200 p-3 hover:border-brand-300 dark:border-slate-800"
              >
                <p className="text-xl font-bold">{f.number(data.counts.products)}</p>
                <p className="text-xs text-slate-500">{t('dashboard.products')}</p>
              </Link>
            </div>
          </div>
        </Card>
        <Card className="overflow-hidden xl:col-span-2">
          <CardHeader
            title={t('dashboard.recentInvoices')}
            action={
              <Link
                to="/invoices"
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                {t('dashboard.viewAll')} <ArrowRight className="size-4" />
              </Link>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                    <td className="table-td">
                      <Link
                        to={`/invoices/${inv.id}`}
                        className="font-medium text-slate-900 hover:text-brand-600 dark:text-white"
                      >
                        {inv.number}
                      </Link>
                      <p className="text-xs text-slate-500">{inv.customer.name}</p>
                    </td>
                    <td className="table-td whitespace-nowrap">{f.date(inv.issueDate)}</td>
                    <td className="table-td">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="table-td text-right font-semibold whitespace-nowrap">
                      {f.money(inv.total, inv.currency)}
                    </td>
                  </tr>
                ))}
                {!data.recentInvoices.length && (
                  <tr>
                    <td className="table-td text-center text-slate-500" colSpan={4}>
                      {t('invoices.empty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
