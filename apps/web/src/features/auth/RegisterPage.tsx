import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { registerSchema, type RegisterInput } from '@salesreport/shared';
import { useAuth } from '../../lib/auth';
import { useFieldError } from '../../lib/format';
import { applyServerErrors, errorMessage } from '../../lib/errors';
import { Button, Input } from '../../components/ui';
import { AuthLayout } from './AuthLayout';

export function RegisterPage() {
  const { t } = useTranslation();
  const fe = useFieldError();
  const { register: registerAccount } = useAuth();
  const nav = useNavigate();
  const [error, setErr] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', companyName: '' },
  });
  const onSubmit = async (v: RegisterInput) => {
    setErr(null);
    try {
      await registerAccount(v);
      nav('/', { replace: true });
    } catch (err) {
      if (!applyServerErrors(err, setError)) setErr(errorMessage(err));
    }
  };
  return (
    <AuthLayout title={t('auth.createAccount')} subtitle={t('auth.createSubtitle')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
          </div>
        )}
        <Input label={t('auth.name')} autoComplete="name" {...register('name')} error={fe(errors.name?.message)} />
        <Input
          label={t('auth.companyName')}
          autoComplete="organization"
          {...register('companyName')}
          error={fe(errors.companyName?.message)}
        />
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
          autoComplete="new-password"
          {...register('password')}
          error={fe(errors.password?.message)}
          hint={t('auth.passwordHint')}
        />
        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
          {isSubmitting ? t('auth.signingUp') : t('auth.signUp')}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        {t('auth.haveAccount')}{' '}
        <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          {t('auth.signIn')}
        </Link>
      </p>
    </AuthLayout>
  );
}
