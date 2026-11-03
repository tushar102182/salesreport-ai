import { Languages, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../lib/theme';
import { cn } from '../../lib/cn';
import { LANGUAGE_LABELS, resolveAppLanguage, SUPPORTED_LANGUAGES } from '../../i18n';

export function LanguageToggle({ className }: { className?: string }) {
  const { i18n, t } = useTranslation();
  const lang = resolveAppLanguage(i18n.resolvedLanguage);
  return (
    <label
      className={cn(
        'relative inline-flex items-center rounded-xl border border-slate-200 bg-white text-xs font-medium dark:border-slate-700 dark:bg-slate-900',
        className,
      )}
    >
      <Languages className="pointer-events-none absolute start-2 size-3.5 text-slate-400" aria-hidden />
      <span className="sr-only">{t('common.language')}</span>
      <select
        value={lang}
        onChange={(e) => void i18n.changeLanguage(e.target.value)}
        aria-label={t('common.language')}
        className="h-9 cursor-pointer appearance-none rounded-xl bg-transparent ps-7 pe-3 text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-slate-200"
      >
        {SUPPORTED_LANGUAGES.map((l) => (
          <option key={l} value={l} className="text-slate-900">
            {LANGUAGE_LABELS[l]}
          </option>
        ))}
      </select>
    </label>
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
