import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { INVOICE_STATUSES, type InvoiceDto, type InvoiceStatus } from '@salesreport/shared';
import { api } from '../../lib/api';
import { qk, useLogoUrl, useOrganization } from '../../lib/queries';
import { useAuth } from '../../lib/auth';
import { useFormat } from '../../lib/format';
import { useToast } from '../../lib/toast';
import { errorMessage } from '../../lib/errors';
import { cn } from '../../lib/cn';
import { Button, Card, ConfirmDialog, EmptyState, FullPageSpinner, PageHeader, StatusBadge } from '../../components/ui';
import { PdfButtons } from '../datasets/ReportButtons';

export function InvoiceDetailPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const f = useFormat();
  const toast = useToast();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const { data: org } = useOrganization();
  const logo = useLogoUrl();
  const [confirm, setConfirm] = useState(false);
  const {
    data: inv,
    isLoading,
    isError,
  } = useQuery({ queryKey: qk.invoice(id), queryFn: () => api<InvoiceDto>(`/invoices/${id}`) });

  const setStatus = useMutation({
    mutationFn: (status: InvoiceStatus) =>
      api<InvoiceDto>(`/invoices/${id}/status`, { method: 'PATCH', body: { status } }),
    onSuccess: (data) => {
      qc.setQueryData(qk.invoice(id), data);
      void qc.invalidateQueries({ queryKey: ['invoices'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(t('common.saved'));
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const del = useMutation({
    mutationFn: () => api(`/invoices/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(t('common.deleted'));
      nav('/invoices');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (isLoading) return <FullPageSpinner />;
  if (isError || !inv)
    return (
      <Card>
        <EmptyState title={t('errors.notFound')} />
      </Card>
    );

  return (
    <div>
      <Link
        to="/invoices"
        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
      >
        <ArrowLeft className="size-4" /> {t('invoices.title')}
      </Link>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {inv.number} <StatusBadge status={inv.status} />
          </span>
        }
        subtitle={
          inv.paidAt
            ? t('invoices.paidOn', { date: f.date(inv.paidAt) })
            : `${t('invoices.issueDate')}: ${f.date(inv.issueDate)}`
        }
        actions={
          <>
            <Link to={`/invoices/${inv.id}/edit`}>
              <Button variant="outline">
                <Pencil className="size-4" /> {t('common.edit')}
              </Button>
            </Link>
            {isAdmin && (
              <Button variant="outline" onClick={() => setConfirm(true)} aria-label={t('common.delete')}>
                <Trash2 className="size-4 text-red-500" />
              </Button>
            )}
            <PdfButtons path={`/invoices/${inv.id}/pdf`} fileBase={inv.number} />
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-500">{t('invoices.markAs')}:</span>
        {INVOICE_STATUSES.map((s) => (
          <button
            key={s}
            disabled={s === inv.status || setStatus.isPending}
            onClick={() => setStatus.mutate(s)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-default',
              s === inv.status
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300',
            )}
          >
            {t(`status.${s}`)}
          </button>
        ))}
      </div>

      {/* On-screen invoice preview (the PDF is rendered server-side with the same data) */}
      <Card className="mx-auto max-w-4xl overflow-hidden" lang={inv.language}>
        <div className="h-2 bg-linear-to-r from-brand-700 to-cyan-500" />
        <div className="p-6 sm:p-10">
          <div className="flex flex-col justify-between gap-6 sm:flex-row">
            <div className="flex gap-4">
              {logo && <img src={logo} alt="" className="size-16 rounded-lg object-contain" />}
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{org?.name}</h2>
                <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                  {org?.address && <p>{org.address}</p>}
                  {(org?.phone || org?.email) && <p>{[org?.phone, org?.email].filter(Boolean).join(' • ')}</p>}
                  {org?.taxId && (
                    <p>
                      {t('settings.taxId')}: {org.taxId}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="sm:text-right">
              <p className="text-3xl font-extrabold tracking-tight text-brand-600">
                {f.lang === 'bn' ? 'ইনভয়েস' : 'INVOICE'}
              </p>
              <p className="mt-1 font-semibold text-slate-900 dark:text-white"># {inv.number}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">{t('invoices.billTo')}</p>
              <p className="mt-2 font-semibold text-slate-900 dark:text-white">{inv.customer.name}</p>
              <div className="mt-1 space-y-0.5 text-sm text-slate-500">
                {inv.customer.address && <p>{inv.customer.address}</p>}
                {inv.customer.phone && <p>{inv.customer.phone}</p>}
                {inv.customer.email && <p>{inv.customer.email}</p>}
              </div>
            </div>
            <dl className="space-y-1.5 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/50">
              <div className="flex justify-between">
                <dt className="text-slate-500">{t('invoices.issueDate')}</dt>
                <dd className="font-medium">{f.date(inv.issueDate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">{t('invoices.dueDate')}</dt>
                <dd className="font-medium">{f.date(inv.dueDate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">{t('invoices.currency')}</dt>
                <dd className="font-medium">{inv.currency}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-brand-600 text-white">
                  <th className="rounded-l-lg px-3 py-2.5 text-left text-xs font-semibold">#</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold">{t('invoices.description')}</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold">{t('invoices.quantity')}</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold">{t('invoices.unitPrice')}</th>
                  <th className="rounded-r-lg px-3 py-2.5 text-right text-xs font-semibold">{t('invoices.amount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {inv.items.map((it, i) => (
                  <tr key={it.id}>
                    <td className="px-3 py-3 text-sm text-slate-400">{f.number(i + 1)}</td>
                    <td className="px-3 py-3 text-sm text-slate-900 dark:text-white">{it.description}</td>
                    <td className="px-3 py-3 text-right text-sm">{f.number(it.quantity)}</td>
                    <td className="px-3 py-3 text-right text-sm whitespace-nowrap">
                      {f.money(it.unitPrice, inv.currency)}
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-semibold whitespace-nowrap">
                      {f.money(it.lineTotal, inv.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-6 sm:flex-row sm:justify-between">
            <div className="max-w-sm text-sm text-slate-500">
              {(inv.notes || org?.invoiceNotes) && (
                <>
                  <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">{t('common.notes')}</p>
                  <p className="mt-1 whitespace-pre-line">
                    {[inv.notes, org?.invoiceNotes].filter(Boolean).join('\n\n')}
                  </p>
                </>
              )}
            </div>
            <dl className="w-full space-y-2 text-sm sm:w-72">
              <div className="flex justify-between">
                <dt className="text-slate-500">{t('invoices.subtotal')}</dt>
                <dd>{f.money(inv.subtotal, inv.currency)}</dd>
              </div>
              {inv.discountTotal > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">
                    {t('invoices.discount')}
                    {inv.discountType === 'percent' ? ` (${f.number(inv.discountValue)}%)` : ''}
                  </dt>
                  <dd>- {f.money(inv.discountTotal, inv.currency)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-slate-500">
                  {t('invoices.tax')} ({f.number(inv.taxRate)}%)
                </dt>
                <dd>{f.money(inv.taxTotal, inv.currency)}</dd>
              </div>
              <div className="flex justify-between rounded-xl bg-brand-600 px-4 py-3 text-base font-bold text-white">
                <dt>{t('invoices.grandTotal')}</dt>
                <dd>{f.money(inv.total, inv.currency)}</dd>
              </div>
            </dl>
          </div>
          {org?.invoiceFooter && (
            <p className="mt-10 border-t border-slate-100 pt-4 text-center text-xs text-slate-400 dark:border-slate-800">
              {org.invoiceFooter}
            </p>
          )}
        </div>
      </Card>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => del.mutate()}
        loading={del.isPending}
        message={t('invoices.deleteConfirm')}
      />
    </div>
  );
}
