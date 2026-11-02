import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Download } from 'lucide-react';
import type { Analytics, DatasetDto } from '@salesreport/shared';
import { api, downloadFile } from '../../lib/api';
import { qk } from '../../lib/queries';
import { useFormat } from '../../lib/format';
import { Button, FullPageSpinner, PageHeader, Card, EmptyState } from '../../components/ui';
import { ChartsGrid, KpiGrid, TopTables } from './AnalyticsView';
import { SummaryCard } from './SummaryCard';
import { PdfButtons } from './ReportButtons';

export function DatasetDetailPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const f = useFormat();
  const ds = useQuery({ queryKey: qk.dataset(id), queryFn: () => api<DatasetDto>(`/datasets/${id}`) });
  const analytics = useQuery({
    queryKey: qk.analytics(id),
    queryFn: () => api<Analytics>(`/datasets/${id}/analytics`),
  });

  if (ds.isLoading || analytics.isLoading) return <FullPageSpinner />;
  if (ds.isError || !ds.data || !analytics.data) {
    return (
      <Card>
        <EmptyState
          title={t('errors.notFound')}
          action={
            <Link to="/datasets">
              <Button>{t('common.back')}</Button>
            </Link>
          }
        />
      </Card>
    );
  }
  const d = ds.data;
  const a = analytics.data;
  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/datasets"
          className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="size-4" /> {t('datasets.title')}
        </Link>
        <PageHeader
          title={d.name}
          subtitle={`${t('analytics.period', { start: f.date(a.periodStart), end: f.date(a.periodEnd) })} · ${f.number(d.rowCount)} ${t('datasets.rows')}${d.skippedRows ? ` · ${t('datasets.skipped', { n: f.number(d.skippedRows) })}` : ''}`}
          actions={
            <>
              <Button
                variant="outline"
                onClick={() => void downloadFile(`/datasets/${id}/export.csv`, `${d.name}.csv`)}
              >
                <Download className="size-4" /> {t('common.export')}
              </Button>
              <PdfButtons path={`/datasets/${id}/report.pdf`} fileBase={d.name} />
            </>
          }
        />
      </div>
      <KpiGrid a={a} />
      <SummaryCard datasetId={id} />
      <ChartsGrid a={a} />
      <TopTables a={a} />
    </div>
  );
}
