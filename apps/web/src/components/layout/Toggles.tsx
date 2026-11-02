import { Languages, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../lib/theme';
import { cn } from '../../lib/cn';

export function LanguageToggle({ className }: { className?: string }) {
  const { i18n, t } = useTranslation();
  const lang = i18n.resolvedLanguage?.startsWith('bn') ? 'bn' : 'en';
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-xl border border-slate-200 bg-white p-0.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-900',
        className,
      )}
      role="group"
      aria-label={t('common.language')}
    >
      <Languages className="mx-1.5 size-3.5 text-slate-400" aria-hidden />
      {(['en', 'bn'] as const).map((l) => (
        <button
          key={l}
          onClick={() => void i18n.changeLanguage(l)}
          aria-pressed={lang === l}
          className={cn(
            'rounded-lg px-2.5 py-1 transition-colors',
            lang === l
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white',
          )}
        >
          {l === 'en' ? 'EN' : 'বাং'}
        </button>
      ))}
    </div>
  );
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { t } = useTranslation();
  return (
    <button
      onClick={toggle}
      className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white"
      aria-label={`${t('common.theme')}: ${theme === 'dark' ? t('common.dark') : t('common.light')}`}
      title={theme === 'dark' ? t('common.light') : t('common.dark')}
    >
      {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
