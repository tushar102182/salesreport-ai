import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ExternalLink, KeyRound, ShieldCheck, XCircle, Zap } from 'lucide-react';
import { DEFAULT_LLM_MODELS, LLM_PROVIDERS, type AiSettingsDto, type LlmProvider } from '@salesreport/shared';
import { api } from '../../lib/api';
import { qk } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import { errorMessage } from '../../lib/errors';
import { Badge, Button, Card, CardHeader, FullPageSpinner, Input, Select } from '../../components/ui';

const KEY_LINKS: Record<LlmProvider, { label: string; url: string }> = {
  openai: { label: 'OpenAI', url: 'https://platform.openai.com/api-keys' },
  gemini: { label: 'Google Gemini', url: 'https://aistudio.google.com/app/apikey' },
  anthropic: { label: 'Anthropic Claude', url: 'https://console.anthropic.com/settings/keys' },
};

export function AiSettings() {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: qk.ai, queryFn: () => api<AiSettingsDto>('/settings/ai') });
  if (isLoading || !data) return <FullPageSpinner />;
  return <AiForm data={data} onSaved={(d) => qc.setQueryData(qk.ai, d)} toast={toast} t={t} />;
}

function AiForm({
  data,
  onSaved,
  toast,
  t,
}: {
  data: AiSettingsDto;
  onSaved: (d: AiSettingsDto) => void;
  toast: ReturnType<typeof useToast>;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const [provider, setProvider] = useState<LlmProvider | ''>(data.provider ?? '');
  const [model, setModel] = useState(data.model ?? '');
  const [apiKey, setApiKey] = useState('');
  const [test, setTest] = useState<{ ok: boolean; message: string; latencyMs?: number } | null>(null);

  const save = useMutation({
    mutationFn: () =>
      api<AiSettingsDto>('/settings/ai', {
        method: 'PUT',
        body: { provider: provider || null, model: model || null, ...(apiKey ? { apiKey } : {}) },
      }),
    onSuccess: (d) => {
      onSaved(d);
      setApiKey('');
      toast.success(t('common.saved'));
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const removeKey = useMutation({
    mutationFn: () => api<AiSettingsDto>('/settings/ai/key', { method: 'DELETE' }),
    onSuccess: onSaved,
    onError: (e) => toast.error(errorMessage(e)),
  });
  const testConn = useMutation({
    mutationFn: () =>
      api<{ ok: boolean; message: string; latencyMs?: number }>('/settings/ai/test', { method: 'POST' }),
    onSuccess: setTest,
    onError: (e) => toast.error(errorMessage(e)),
  });

  const sourceLabel = {
    organization: t('settings.sourceOrganization'),
    environment: t('settings.sourceEnvironment'),
    none: t('settings.sourceNone'),
  }[data.effective.source];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          icon={<Zap className="size-4" />}
          title={t('settings.aiTitle')}
          subtitle={t('settings.aiSubtitle')}
        />
        <div className="space-y-5 p-5">
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
            <span className="text-slate-500">{t('settings.effective')}:</span>
            <Badge tone={data.effective.source === 'none' ? 'amber' : 'green'}>
              {data.effective.provider === 'rule-based'
                ? t('summary.ruleBased')
                : `${data.effective.provider} · ${data.effective.model}`}
            </Badge>
            <span className="text-xs text-slate-500">({sourceLabel})</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label={t('settings.provider')}
              value={provider}
              onChange={(e) => setProvider(e.target.value as LlmProvider | '')}
            >
              <option value="">{t('settings.useEnv')}</option>
              {LLM_PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {KEY_LINKS[p].label}
                </option>
              ))}
            </Select>
            <Input
              label={t('settings.model')}
              value={model}
              maxLength={100}
              onChange={(e) => setModel(e.target.value)}
              placeholder={provider ? t('settings.modelPlaceholder', { model: DEFAULT_LLM_MODELS[provider] }) : ''}
              disabled={!provider}
            />
            <Input
              label={
                <span className="inline-flex items-center gap-1.5">
                  <KeyRound className="size-3.5" /> {t('settings.apiKey')}
                </span>
              }
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={t('settings.apiKeyPlaceholder')}
              disabled={!provider || data.demoMode}
              wrapperClassName="sm:col-span-2"
              hint={
                data.apiKeyMasked ? (
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-emerald-500" /> {t('settings.storedKey')}:{' '}
                    <code className="font-mono">{data.apiKeyMasked}</code>
                  </span>
                ) : data.demoMode ? (
                  t('app.demoBanner')
                ) : undefined
              }
            />
          </div>
          {provider && (
            <a
              href={KEY_LINKS[provider].url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
            >
              {t('settings.getKey')} ({KEY_LINKS[provider].label}) <ExternalLink className="size-3.5" />
            </a>
          )}
          {test && (
            <div
              className={`flex items-center gap-2 rounded-xl p-3 text-sm ${test.ok ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200' : 'bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-200'}`}
            >
              {test.ok ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
              {test.message}
              {test.latencyMs ? ` · ${test.latencyMs} ms` : ''}
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            {data.hasOrgKey && (
              <Button variant="ghost" onClick={() => removeKey.mutate()} loading={removeKey.isPending}>
                {t('settings.removeKey')}
              </Button>
            )}
            <Button variant="outline" onClick={() => testConn.mutate()} loading={testConn.isPending}>
              {testConn.isPending ? t('settings.testing') : t('settings.testConnection')}
            </Button>
            <Button onClick={() => save.mutate()} loading={save.isPending}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
