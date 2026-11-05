import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  Upload,
  Users,
  X,
  Info,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { usePublicConfig, useOrganization, useLogoUrl } from '../../lib/queries';
import { cn } from '../../lib/cn';
import { Logo } from './Logo';
import { CurrencyToggle, LanguageToggle, ThemeToggle } from './Toggles';

const NAV = [
  { to: '/', key: 'dashboard', icon: LayoutDashboard, end: true },
  { to: '/upload', key: 'upload', icon: Upload },
  { to: '/datasets', key: 'datasets', icon: FileSpreadsheet },
  { to: '/invoices', key: 'invoices', icon: FileText },
  { to: '/customers', key: 'customers', icon: Users },
  { to: '/products', key: 'products', icon: Package },
  { to: '/settings', key: 'settings', icon: Settings },
] as const;

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { data: org } = useOrganization();
  const logo = useLogoUrl();
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-5 pb-6">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1 px-3" aria-label="Main">
        {NAV.map(({ to, key, icon: Icon, ...rest }) => (
          <NavLink
            key={to}
            to={to}
            end={'end' in rest}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white',
              )
            }
          >
            <Icon className="size-[18px] shrink-0" />
            {t(`nav.${key}`)}
          </NavLink>
        ))}
      </nav>
      <div className="m-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center gap-3">
          {logo ? (
            <img src={logo} alt="" className="size-9 rounded-lg bg-white object-contain p-0.5" />
          ) : (
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">
              {(user?.name ?? '?').slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user?.name}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {org?.name} · {t(`settings.${user?.role ?? 'staff'}`)}
            </p>
          </div>
          <button
            onClick={() => void logout()}
            className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-red-600 dark:hover:bg-slate-800"
            aria-label={t('nav.logout')}
            title={t('nav.logout')}
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const { data: cfg } = usePublicConfig();
  const location = useLocation();
  const current = NAV.find((n) => (n.to === '/' ? location.pathname === '/' : location.pathname.startsWith(n.to)));

  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block dark:border-slate-800 dark:bg-slate-950">
        <Sidebar />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/50" onClick={() => setOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-72 animate-fade-in bg-white shadow-xl dark:bg-slate-950">
            <button
              className="absolute top-5 right-4 rounded-lg p-1.5 text-slate-500"
              onClick={() => setOpen(false)}
              aria-label={t('nav.close')}
            >
              <X className="size-5" />
            </button>
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        {cfg?.demoMode && (
          <div className="flex items-center justify-center gap-2 bg-linear-to-r from-brand-600 to-cyan-600 px-4 py-1.5 text-center text-xs font-medium text-white">
            <Info className="size-3.5" /> {t('app.demoBanner')}
          </div>
        )}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md sm:px-6 dark:border-slate-800 dark:bg-slate-950/80">
          <button
            className="rounded-lg p-2 text-slate-600 lg:hidden dark:text-slate-300"
            onClick={() => setOpen(true)}
            aria-label={t('nav.menu')}
          >
            <Menu className="size-5" />
          </button>
          <div className="hidden min-[400px]:block lg:hidden">
            <Logo compact />
          </div>
          <p className="hidden text-sm font-medium text-slate-500 sm:block dark:text-slate-400">
            {current ? t(`nav.${current.key}`) : ''}
          </p>
          <div className="ms-auto flex items-center gap-1.5 sm:gap-2">
            <LanguageToggle />
            <CurrencyToggle />
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
