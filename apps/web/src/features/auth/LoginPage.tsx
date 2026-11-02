import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { AlertCircle, Sparkles } from 'lucide-react';
import { loginSchema, type LoginInput } from '@salesreport/shared';
import { useAuth } from '../../lib/auth';
import { usePublicConfig } from '../../lib/queries';
import { useFieldError } from '../../lib/format';
import { errorMessage } from '../../lib/errors';
import { Button, Input } from '../../components/ui';
import { AuthLayout } from './AuthLayout';

export function LoginPage() {
  const { t } = useTranslation();
  const fe = useFieldError();
  const { login } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const { data: cfg } = usePublicConfig();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const onSubmit = async (v: LoginInput) => {
    setError(null);
    try {
      await login(v);
      nav(from, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <AuthLayout title={t('auth.welcomeBack')} subtitle={t('auth.signInSubtitle')}>
      {cfg?.demoCredentials && (
        <div className="mb-6 rounded-2xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
          <p className="flex items-center gap-2 text-sm font-semibold text-brand-800 dark:text-brand-200">
            <Sparkles className="size-4" /> {t('auth.demoHint')}
          </p>
          <p className="mt-1 font-mono text-xs text-brand-700 dark:text-brand-300">
            {cfg.demoCredentials.email} / {cfg.demoCredentials.password}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => {
              setValue('email', cfg.demoCredentials!.email);
              setValue('password', cfg.demoCredentials!.password);
            }}
          >
            {t('auth.useDemo')}
          </Button>
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
          </div>
        )}
        <Input
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          {...register('email')}
          error={fe(errors.email?.message)}
        />
        <Input
          label={t('auth.password')}
          type="password"
          autoComplete="current-password"
          {...register('password')}
          error={fe(errors.password?.message)}
        />
        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
          {isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
        </Button>
      </form>
      {cfg?.allowRegistration !== false && (
        <p className="mt-6 text-center text-sm text-slate-500">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
            {t('auth.signUp')}
          </Link>
        </p>
      )}
    </AuthLayout>
  );
}
