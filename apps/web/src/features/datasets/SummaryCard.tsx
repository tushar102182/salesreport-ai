import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Lightbulb, RefreshCw, Sparkles, Target, AlertCircle } from 'lucide-react';
import type { AiSummary, Language } from '@salesreport/shared';
import { api } from '../../lib/api';
import { qk } from '../../lib/queries';
import { errorMessage } from '../../lib/errors';
import { useToast } from '../../lib/toast';
import { useFormat } from '../../lib/format';
import { Badge, Button, Card, Skeleton } from '../../components/ui';
import { cn } from '../../lib/cn';

interface SummaryResponse {
  summary: AiSummary;
  cached: boolean;
  fallbackReason?: string;
}

export function SummaryCard({ datasetId }: { datasetId: string }) {
  const { t } = useTranslation();
  const f = useFormat();
  const toast = useToast();
  const qc = useQueryClient();
  const [lang, setLang] = useState<Language>(f.lang);
  const [fallback, setFallback] = useState<string | null>(null);

  const existing = useQuery({
    queryKey: qk.summary(datasetId, lang),
    queryFn: () => api<{ summary: AiSummary | null }>(`/datasets/${datasetId}/summary`, { query: { lang } }),
  });

  const generate = useMutation({
    mutationFn: (regenerate: boolean) =>
      api<SummaryResponse>(`/datasets/${datasetId}/summary`, { method: 'POST', body: { language: lang, regenerate } }),
    onSuccess: (res) => {
      qc.setQueryData(qk.summary(datasetId, lang), { summary: res.summary });
      setFallback(res.fallbackReason ?? null);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const summary = existing.data?.summary;
  const providerLabel = summary
    ? summary.provider === 'rule-based'
      ? t('summary.ruleBased')
      : `${summary.provider}${summary.model ? ` · ${summary.model}` : ''}`
    : '';

  return (
    <Card className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-linear-to-br from-brand-500/20 to-cyan-400/20 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-brand-600 to-cyan-500 text-white">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t('summary.title')}</h3>
            {summary && <p className="text-xs text-slate-500">{t('summary.provider', { provider: providerLabel })}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs dark:bg-slate-800"
            role="group"
            aria-label={t('summary.language')}
          >
            {(['en', 'bn'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium',
                  lang === l ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500',
                )}
              >
                {l === 'en' ? 'English' : 'বাংলা'}
              </button>
            ))}
          </div>
          {summary && (
            <Button variant="outline" size="sm" onClick={() => generate.mutate(true)} loading={generate.isPending}>
              {!generate.isPending && <RefreshCw className="size-3.5" />}
              {t('summary.regenerate')}
            </Button>
          )}
        </div>
      </div>

      <div className="relative p-5" lang={lang}>
        {existing.isLoading || generate.isPending ? (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm text-brand-600">
              <Sparkles className="size-4 animate-pulse" /> {t('summary.generating')}
            </p>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : summary ? (
          <div className="space-y-5">
            {fallback && (
              <div className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                <AlertCircle className="size-4 shrink-0" /> {t('summary.fallback', { reason: fallback })}
              </div>
            )}
            <div className="rounded-xl bg-brand-50 p-4 dark:bg-brand-500/10">
              <p className="text-base font-semibold text-brand-900 dark:text-brand-100">{summary.headline}</p>
            </div>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{summary.overview}</p>
            <div className="grid gap-5 md:grid-cols-2">
              <section>
                <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <Lightbulb className="size-4 text-amber-500" /> {t('summary.insights')}
                </h4>
                <ul className="space-y-2">
                  {summary.insights.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" /> {s}
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <Target className="size-4 text-emerald-500" /> {t('summary.recommendations')}
                </h4>
                <ul className="space-y-2">
                  {summary.recommendations.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-emerald-500" /> {s}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
            {summary.provider === 'rule-based' && <Badge tone="slate">{t('summary.configureHint')}</Badge>}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <p className="max-w-md text-sm text-slate-500">{t('summary.empty')}</p>
            <Button onClick={() => generate.mutate(false)} loading={generate.isPending}>
              <Sparkles className="size-4" /> {t('summary.generate')}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
