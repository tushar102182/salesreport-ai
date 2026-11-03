import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Globe2,
  Lock,
  PlayCircle,
  Receipt,
  Sparkles,
  Users,
} from 'lucide-react';
import { Logo } from '../../components/layout/Logo';
import { LanguageToggle, ThemeToggle } from '../../components/layout/Toggles';

const FEATURE_ICONS = [FileSpreadsheet, Sparkles, BarChart3, FileText, Receipt, Globe2, Users, Lock];
const SHOTS = [
  { src: '/landing/02-dashboard.webp', key: 'dashboard' },
  { src: '/landing/03-ai-summary.webp', key: 'summary' },
  { src: '/landing/04-charts.webp', key: 'charts' },
  { src: '/landing/06-invoices.webp', key: 'invoices' },
  { src: '/landing/07-invoice-detail.webp', key: 'invoice' },
  { src: '/landing/10-dashboard-bangla-dark.webp', key: 'dark' },
] as const;

function DemoButton({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <Link
      to="/login"
      className={`inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand-700 shadow-lg shadow-brand-900/20 transition hover:-translate-y-0.5 hover:bg-brand-50 ${className}`}
    >
      <PlayCircle className="size-5" /> {t('landing.liveDemo')}
    </Link>
  );
}

export function LandingPage() {
  const { t } = useTranslation();
  const features = t('landing.features', { returnObjects: true }) as unknown as { title: string; body: string }[];
  const benefits = t('landing.benefits', { returnObjects: true }) as unknown as string[];
  const steps = t('landing.steps', { returnObjects: true }) as unknown as { title: string; body: string }[];
  const stats = t('landing.stats', { returnObjects: true }) as unknown as { value: string; label: string }[];

  return (
    <div className="min-h-dvh bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 font-bold">
            <Logo />
          </div>
          <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex dark:text-slate-300">
            <a href="#features" className="hover:text-brand-600">{t('landing.navFeatures')}</a>
            <a href="#screens" className="hover:text-brand-600">{t('landing.navScreens')}</a>
            <a href="#benefits" className="hover:text-brand-600">{t('landing.navBenefits')}</a>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <Link
              to="/login"
              className="hidden rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 sm:inline-flex"
            >
              {t('landing.liveDemo')}
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-linear-to-br from-brand-800 via-brand-600 to-cyan-500 text-white">
        <div className="absolute -top-32 -right-24 size-[28rem] rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="absolute -bottom-40 -left-24 size-[28rem] rounded-full bg-cyan-300/20 blur-3xl" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <Sparkles className="size-3.5" /> {t('landing.badge')}
            </span>
            <h1 className="mt-5 text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl">{t('landing.heroTitle')}</h1>
            <p className="mt-5 max-w-xl text-lg text-white/85">{t('landing.heroSubtitle')}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <DemoButton />
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                {t('landing.seeFeatures')} <ArrowRight className="size-4" />
              </a>
            </div>
            <p className="mt-4 text-xs text-white/70">{t('landing.demoNote')}</p>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-2 shadow-2xl backdrop-blur">
              <img src="/landing/02-dashboard.webp" alt={t('landing.shots.dashboard')} className="w-full rounded-xl" width={1280} height={720} />
            </div>
            <div className="absolute -bottom-6 -left-6 hidden w-1/2 overflow-hidden rounded-xl border border-white/30 shadow-xl sm:block">
              <img src="/landing/03-ai-summary.webp" alt={t('landing.shots.summary')} className="w-full" width={1280} height={720} loading="lazy" />
            </div>
          </div>
        </div>
        <div className="relative mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 pb-14 sm:px-6 md:grid-cols-4">
          {Array.isArray(stats) &&
            stats.map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/10 p-4 text-center backdrop-blur">
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-white/75">{s.label}</p>
              </div>
            ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight">{t('landing.featuresTitle')}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-500 dark:text-slate-400">{t('landing.featuresSubtitle')}</p>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.isArray(features) &&
            features.map((f, i) => {
              const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length]!;
              return (
                <div
                  key={f.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="inline-flex rounded-xl bg-brand-50 p-2.5 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{f.body}</p>
                </div>
              );
            })}
        </div>
      </section>

      <section id="screens" className="bg-slate-50 py-20 dark:bg-slate-900/50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">{t('landing.screensTitle')}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-500 dark:text-slate-400">{t('landing.screensSubtitle')}</p>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {SHOTS.map((s) => (
              <figure key={s.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <img src={s.src} alt={t(`landing.shots.${s.key}`)} className="aspect-video w-full object-cover" width={1280} height={720} loading="lazy" />
                <figcaption className="px-4 py-3 text-sm font-medium">{t(`landing.shots.${s.key}`)}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section id="benefits" className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('landing.benefitsTitle')}</h2>
          <ul className="mt-8 space-y-4">
            {Array.isArray(benefits) &&
              benefits.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" /> <span>{b}</span>
                </li>
              ))}
          </ul>
        </div>
        <div className="space-y-4">
          {Array.isArray(steps) &&
            steps.map((s, i) => (
              <div key={s.title} className="flex gap-4 rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-600 font-bold text-white">{i + 1}</span>
                <div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{s.body}</p>
                </div>
              </div>
            ))}
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-3xl bg-linear-to-r from-brand-700 to-cyan-600 px-8 py-14 text-center text-white">
          <h2 className="text-3xl font-bold tracking-tight">{t('landing.ctaTitle')}</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85">{t('landing.ctaSubtitle')}</p>
          <DemoButton className="mt-8" />
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-500 dark:border-slate-800">
        © {new Date().getFullYear()} SalesReport AI
      </footer>
    </div>
  );
}
