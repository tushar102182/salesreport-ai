import { NavLink, Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, Sparkles, UserCircle, Users } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useOrganization } from '../../lib/queries';
import { cn } from '../../lib/cn';
import { FullPageSpinner, PageHeader } from '../../components/ui';
import { CompanySettings } from './CompanySettings';
import { AiSettings } from './AiSettings';
import { UsersSettings } from './UsersSettings';
import { ProfileSettings } from './ProfileSettings';

const TABS = [
  { id: 'company', icon: Building2, admin: false },
  { id: 'ai', icon: Sparkles, admin: true },
  { id: 'users', icon: Users, admin: true },
  { id: 'profile', icon: UserCircle, admin: false },
] as const;

export function SettingsPage() {
  const { tab = 'company' } = useParams();
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const { data: org } = useOrganization();
  const visible = TABS.filter((x) => !x.admin || isAdmin);
  if (!visible.some((x) => x.id === tab)) return <Navigate to="/settings/company" replace />;

  return (
    <div>
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
        {visible.map(({ id, icon: Icon }) => (
          <NavLink
            key={id}
            to={`/settings/${id}`}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                isActive || (id === 'company' && tab === 'company')
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
              )
            }
          >
            <Icon className="size-4" /> {t(`settings.${id}`)}
          </NavLink>
        ))}
      </div>
      {tab === 'company' && (org ? <CompanySettings org={org} /> : <FullPageSpinner />)}
      {tab === 'ai' && <AiSettings />}
      {tab === 'users' && <UsersSettings />}
      {tab === 'profile' && <ProfileSettings />}
    </div>
  );
}
