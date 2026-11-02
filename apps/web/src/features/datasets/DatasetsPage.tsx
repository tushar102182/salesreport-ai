import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileSpreadsheet, Search, Trash2, Upload } from 'lucide-react';
import type { DatasetDto, Paginated } from '@salesreport/shared';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { qk } from '../../lib/queries';
import { useFormat } from '../../lib/format';
import { useToast } from '../../lib/toast';
import { errorMessage } from '../../lib/errors';
import { useDebounced } from '../../lib/useDebounced';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Pagination, PageHeader, Skeleton } from '../../components/ui';

export function DatasetsPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const toast = useToast();
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [toDelete, setToDelete] = useState<DatasetDto | null>(null);
  const params = { page, q: dq, pageSize: 10 };
  const { data, isLoading } = useQuery({
    queryKey: qk.datasets(params),
    queryFn: () => api<Paginated<DatasetDto>>('/datasets', { query: params }),
    placeholderData: keepPreviousData,
  });
  const del = useMutation({
    mutationFn: (id: string) => api(`/datasets/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(t('common.deleted'));
      setToDelete(null);
      void qc.invalidateQueries({ queryKey: ['datasets'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div>
      <PageHeader
        title={t('datasets.title')}
        subtitle={t('datasets.subtitle')}
        actions={
          <Link to="/upload">
            <Button>
              <Upload className="size-4" /> {t('datasets.upload')}
            </Button>
          </Link>
        }
      />
      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder={t('common.search')}
              value={q}
              onChange={(e) => (setQ(e.target.value), setPage(1))}
              aria-label={t('common.search')}
            />
          </div>
        </div>
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState
            icon={<FileSpreadsheet className="size-6" />}
            title={t('datasets.empty')}
            hint={t('datasets.emptyHint')}
            action={
              <Link to="/upload">
                <Button>{t('datasets.upload')}</Button>
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900/60">
                <tr>
                  <th className="table-th">{t('datasets.name')}</th>
                  <th className="table-th">{t('datasets.period')}</th>
                  <th className="table-th text-right">{t('datasets.rows')}</th>
                  <th className="table-th text-right">{t('datasets.revenue')}</th>
                  <th className="table-th">{t('common.createdAt')}</th>
                  <th className="table-th sr-only">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.items.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                    <td className="table-td">
                      <Link to={`/datasets/${d.id}`} className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10">
                          <FileSpreadsheet className="size-4" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 hover:text-brand-600 dark:text-white">{d.name}</p>
                          <p className="text-xs text-slate-500">
                            {d.originalFilename} <Badge className="ml-1">{d.fileType.toUpperCase()}</Badge>
                          </p>
                        </div>
                      </Link>
                    </td>
                    <td className="table-td whitespace-nowrap">
                      {f.date(d.periodStart)} – {f.date(d.periodEnd)}
                    </td>
                    <td className="table-td text-right">{f.number(d.rowCount)}</td>
                    <td className="table-td text-right font-semibold">{f.money(d.totalRevenue ?? 0, d.currency)}</td>
                    <td className="table-td whitespace-nowrap">{f.date(d.createdAt)}</td>
                    <td className="table-td text-right">
                      <div className="flex justify-end gap-1">
                        <Link to={`/datasets/${d.id}`}>
                          <Button variant="outline" size="sm">
                            {t('common.view')}
                          </Button>
                        </Link>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setToDelete(d)}
                            aria-label={t('common.delete')}
                          >
                            <Trash2 className="size-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} />}
      </Card>
      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
        loading={del.isPending}
        message={t('datasets.deleteConfirm')}
      />
    </div>
  );
}
