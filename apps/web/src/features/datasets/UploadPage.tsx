import { useCallback, useMemo, useRef, useState, type DragEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowLeft, Check, FileSpreadsheet, UploadCloud } from 'lucide-react';
import {
  MAPPABLE_FIELDS,
  UPLOAD_LIMITS,
  columnMappingSchema,
  type ColumnMapping,
  type ImportResultDto,
  type MappableField,
  type UploadPreviewDto,
} from '@salesreport/shared';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import { useToast } from '../../lib/toast';
import { useFieldError, useFormat } from '../../lib/format';
import { cn } from '../../lib/cn';
import { Button, Card, Input, PageHeader, Select } from '../../components/ui';

type Mapping = Partial<Record<MappableField, string>>;
const REQUIRED: MappableField[] = ['date', 'product'];

function Steps({ step }: { step: number }) {
  const { t } = useTranslation();
  const labels = [t('upload.step1'), t('upload.step2'), t('upload.step3')];
  return (
    <ol className="mb-6 flex items-center gap-2 sm:gap-4">
      {labels.map((l, i) => (
        <li key={l} className="flex flex-1 items-center gap-2">
          <span
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
              i < step
                ? 'bg-emerald-500 text-white'
                : i === step
                  ? 'bg-brand-600 text-white ring-4 ring-brand-600/15'
                  : 'bg-slate-200 text-slate-500 dark:bg-slate-800',
            )}
          >
            {i < step ? <Check className="size-4" /> : i + 1}
          </span>
          <span
            className={cn(
              'hidden text-sm font-medium sm:block',
              i === step ? 'text-slate-900 dark:text-white' : 'text-slate-500',
            )}
          >
            {l}
          </span>
          {i < labels.length - 1 && <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />}
        </li>
      ))}
    </ol>
  );
}

export function UploadPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const fe = useFieldError();
  const toast = useToast();
  const nav = useNavigate();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<UploadPreviewDto | null>(null);
  const [mapping, setMapping] = useState<Mapping>({});
  const [name, setName] = useState('');
  const [dateFormat, setDateFormat] = useState<'auto' | 'YMD' | 'DMY' | 'MDY'>('auto');
  const [drag, setDrag] = useState(false);
  const [result, setResult] = useState<ImportResultDto | null>(null);

  const previewMut = useMutation({
    mutationFn: (fl: File) => {
      const form = new FormData();
      form.append('file', fl);
      return api<UploadPreviewDto>('/datasets/preview', { method: 'POST', form });
    },
    onSuccess: (p, fl) => {
      setPreview(p);
      setMapping(p.suggestedMapping);
      setName(fl.name.replace(/\.(csv|xlsx)$/i, ''));
    },
    onError: (err) => {
      setFile(null);
      toast.error(errorMessage(err));
    },
  });

  const importMut = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.append('name', name.trim() || 'Sales data');
      form.append('mapping', JSON.stringify(Object.fromEntries(Object.entries(mapping).filter(([, v]) => v))));
      form.append('dateFormat', dateFormat);
      form.append('file', file!);
      return api<ImportResultDto>('/datasets', { method: 'POST', form });
    },
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['datasets'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(
        res.skipped
          ? t('upload.successSkipped', { imported: f.number(res.imported), skipped: f.number(res.skipped) })
          : t('upload.success', { imported: f.number(res.imported) }),
      );
      if (res.errors.length) setResult(res);
      else nav(`/datasets/${res.dataset.id}`);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const pick = useCallback(
    (fl: File | undefined) => {
      if (!fl) return;
      if (!/\.(csv|xlsx)$/i.test(fl.name)) return toast.error(t('upload.supported'));
      if (fl.size > UPLOAD_LIMITS.maxFileBytes) return toast.error('File is too large (max 10 MB)');
      setFile(fl);
      setResult(null);
      previewMut.mutate(fl);
    },
    [previewMut, t, toast],
  );

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    pick(e.dataTransfer.files[0]);
  };

  const validation = useMemo(() => columnMappingSchema.safeParse(mapping), [mapping]);
  const mappingError = validation.success ? null : fe(validation.error.issues[0]?.message);
  const step = !preview ? 0 : 1;

  const reset = () => {
    setFile(null);
    setPreview(null);
    setMapping({});
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <PageHeader title={t('upload.title')} subtitle={t('upload.subtitle')} />
      <Steps step={result ? 3 : step + (preview && validation.success ? 1 : 0)} />

      {!preview ? (
        <Card className="p-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            className={cn(
              'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors',
              drag ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-slate-300 dark:border-slate-700',
            )}
          >
            <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
              <UploadCloud className="size-8" />
            </div>
            <p className="text-base font-semibold text-slate-900 dark:text-white">
              {previewMut.isPending ? t('upload.parsing') : t('upload.dropHere')}
            </p>
            <p className="my-2 text-sm text-slate-500">{t('upload.or')}</p>
            <Button onClick={() => inputRef.current?.click()} loading={previewMut.isPending}>
              {t('upload.browse')}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0])}
            />
            <p className="mt-4 text-xs text-slate-500">{t('upload.supported')}</p>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            {t('upload.sampleFiles')}
            {['sales-sample.csv', 'sales-sample.xlsx', 'sales-sample-bangla.csv'].map((s) => (
              <a
                key={s}
                href={`/samples/${s}`}
                download
                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              >
                <FileSpreadsheet className="size-3.5" /> {s}
              </a>
            ))}
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="size-8 text-emerald-600" />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{preview.fileName}</p>
                  <p className="text-xs text-slate-500">
                    {preview.fileType.toUpperCase()} · {f.number(preview.totalRows)} {t('datasets.rows')}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>
                <ArrowLeft className="size-4" /> {t('upload.changeFile')}
              </Button>
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t('upload.mappingTitle')}</h3>
            <p className="mt-1 mb-4 text-xs text-slate-500">{t('upload.mappingHint')}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {MAPPABLE_FIELDS.map((field) => (
                <Select
                  key={field}
                  label={
                    <span>
                      {t(`upload.field.${field}`)} {REQUIRED.includes(field) && <span className="text-red-500">*</span>}
                    </span>
                  }
                  value={mapping[field] ?? ''}
                  onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value || undefined }))}
                >
                  <option value="">{t('upload.notMapped')}</option>
                  {preview.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Select>
              ))}
              <Select
                label={t('upload.dateFormat')}
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value as typeof dateFormat)}
              >
                <option value="auto">{t('upload.dateFormatAuto')}</option>
                <option value="DMY">DD/MM/YYYY</option>
                <option value="MDY">MM/DD/YYYY</option>
                <option value="YMD">YYYY-MM-DD</option>
              </Select>
              <Input
                label={t('upload.datasetName')}
                value={name}
                maxLength={120}
                onChange={(e) => setName(e.target.value)}
                wrapperClassName="sm:col-span-2"
              />
            </div>
            {mappingError && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-red-600">
                <AlertTriangle className="size-4" /> {mappingError}
              </p>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-3 text-sm font-medium text-slate-700 dark:border-slate-800 dark:text-slate-300">
              {t('upload.preview', { n: f.number(preview.rows.length), total: f.number(preview.totalRows) })}
            </div>
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900">
                  <tr>
                    {preview.headers.map((h) => {
                      const mappedAs = (Object.entries(mapping) as [MappableField, string][]).find(
                        ([, v]) => v === h,
                      )?.[0];
                      return (
                        <th key={h} className="table-th whitespace-nowrap">
                          {h}
                          {mappedAs && (
                            <span className="ml-1.5 rounded bg-brand-100 px-1.5 py-0.5 text-[10px] text-brand-700 normal-case dark:bg-brand-500/20 dark:text-brand-200">
                              {t(`upload.field.${mappedAs}`)}
                            </span>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {preview.rows.map((r, i) => (
                    <tr key={i}>
                      {preview.headers.map((h) => (
                        <td key={h} className="table-td whitespace-nowrap">
                          {r[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {result && result.errors.length > 0 && (
            <Card className="border-amber-200 p-5 dark:border-amber-900">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
                <AlertTriangle className="size-4" /> {t('upload.rowErrors')}
              </h3>
              <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs text-slate-600 dark:text-slate-300">
                {result.errors.map((e) => (
                  <li key={e.row}>
                    {t('upload.row', { row: f.number(e.row) })}: {e.message}
                  </li>
                ))}
              </ul>
              <Button className="mt-4" onClick={() => nav(`/datasets/${result.dataset.id}`)}>
                {t('common.view')} {t('datasets.analytics')}
              </Button>
            </Card>
          )}

          {!result && (
            <div className="flex justify-end">
              <Button
                size="lg"
                disabled={!validation.success}
                loading={importMut.isPending}
                onClick={() => importMut.mutate()}
              >
                {importMut.isPending ? t('upload.importing') : t('upload.import', { n: f.number(preview.totalRows) })}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export type { ColumnMapping };
