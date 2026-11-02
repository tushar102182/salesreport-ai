import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';
import { Logo } from '../../components/layout/Logo';
import { LanguageToggle, ThemeToggle } from '../../components/layout/Toggles';

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { t } = useTranslation();
  const points = t('auth.heroPoints', { returnObjects: true }) as unknown as string[];
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-linear-to-br from-brand-800 via-brand-600 to-cyan-500 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-cyan-300/20 blur-3xl" aria-hidden />
        <div className="relative flex items-center gap-2.5 text-lg font-bold">
          <div className="rounded-xl bg-white/15 p-1.5 backdrop-blur">
            <Logo compact />
          </div>{' '}
          SalesReport AI
        </div>
        <div className="relative">
          <h2 className="text-4xl leading-tight font-bold tracking-tight">{t('auth.heroTitle')}</h2>
          <p className="mt-3 max-w-md text-brand-100">{t('app.tagline')}</p>
          <ul className="mt-8 space-y-3">
            {Array.isArray(points) &&
              points.map((p) => (
                <li key={p} className="flex items-start gap-3 text-sm text-white/90">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-cyan-200" /> {p}
                </li>
              ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/60">© {new Date().getFullYear()} SalesReport AI</p>
      </div>
      <div className="flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <div className="lg:invisible">
            <Logo />
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-12 sm:px-6">
          <div className="w-full max-w-md">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
            <p className="mt-1.5 mb-8 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
