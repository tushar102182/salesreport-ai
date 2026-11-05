import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { changePasswordSchema, type AuthResponse, type ChangePasswordInput } from '@salesreport/shared';
import { authRequest } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { useFieldError } from '../../lib/format';
import { applyServerErrors, errorMessage } from '../../lib/errors';
import { Badge, Button, Card, CardHeader, Input, Select } from '../../components/ui';
import { CURRENCIES } from '@salesreport/shared';
import { useCurrency } from '../../lib/currency';
import { LANGUAGE_LABELS, resolveAppLanguage, SUPPORTED_LANGUAGES } from '../../i18n';

export function ProfileSettings() {
  const { t, i18n } = useTranslation();
  const { currency, setCurrency, fx } = useCurrency();
  const fe = useFieldError();
  const toast = useToast();
  const { user, applySession } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema) as never,
    defaultValues: { currentPassword: '', newPassword: '' },
  });
  const change = useMutation({
    mutationFn: (body: ChangePasswordInput) => authRequest<AuthResponse>('/auth/change-password', body),
    onSuccess: (auth) => {
      applySession(auth);
      reset();
      toast.success(t('settings.passwordChanged'));
    },
    onError: (e) => applyServerErrors(e, setError) || toast.error(errorMessage(e)),
  });
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title={t('settings.profile')} />
        <dl className="grid gap-4 p-5 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-slate-500">{t('common.name')}</dt>
            <dd className="mt-1 font-medium">{user?.name}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{t('common.email')}</dt>
            <dd className="mt-1 font-medium">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{t('settings.role')}</dt>
            <dd className="mt-1">
              <Badge tone="brand">{t(`settings.${user?.role ?? 'staff'}`)}</Badge>
            </dd>
          </div>
        </dl>
      </Card>
      <Card>
        <CardHeader title={t('settings.preferences')} subtitle={t('settings.preferencesHint')} />
        <div className="grid max-w-xl gap-4 p-5 sm:grid-cols-2">
          <Select
            label={t('common.language')}
            value={resolveAppLanguage(i18n.resolvedLanguage)}
            onChange={(e) => void i18n.changeLanguage(e.target.value)}
            data-testid="settings-language"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {LANGUAGE_LABELS[l]}
              </option>
            ))}
          </Select>
          <Select
            label={t('common.displayCurrency')}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            hint={t('common.approxRates', { date: fx.asOf })}
            data-testid="settings-currency"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </Select>
        </div>
      </Card>
      <Card>
        <CardHeader title={t('settings.changePassword')} />
        <form onSubmit={handleSubmit((v) => change.mutate(v))} className="grid max-w-xl gap-4 p-5" noValidate>
          <Input
            label={t('settings.currentPassword')}
            type="password"
            autoComplete="current-password"
            {...register('currentPassword')}
            error={fe(errors.currentPassword?.message)}
          />
          <Input
            label={t('settings.newPassword')}
            type="password"
            autoComplete="new-password"
            {...register('newPassword')}
            error={fe(errors.newPassword?.message)}
            hint={t('auth.passwordHint')}
          />
          <div>
            <Button type="submit" loading={change.isPending}>
              {t('settings.changePassword')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
