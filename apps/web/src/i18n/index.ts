import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import ar from './locales/ar.json';
import bn from './locales/bn.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import hi from './locales/hi.json';
import pt from './locales/pt.json';

/** UI languages. Add one: create locales/<code>.json and list it here (see docs/CUSTOMIZATION.md). */
export const SUPPORTED_LANGUAGES = ['en', 'bn', 'es', 'fr', 'ar', 'hi', 'pt'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const RTL_LANGUAGES: readonly string[] = ['ar'];

export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  en: 'English',
  bn: 'বাংলা',
  es: 'Español',
  fr: 'Français',
  ar: 'العربية',
  hi: 'हिन्दी',
  pt: 'Português',
};

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      bn: { translation: bn },
      es: { translation: es },
      fr: { translation: fr },
      ar: { translation: ar },
      hi: { translation: hi },
      pt: { translation: pt },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES,
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false }, // React already escapes output
    returnObjects: true,
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'sr-lang',
      caches: ['localStorage'],
    },
  });

export const resolveAppLanguage = (lng?: string): AppLanguage => {
  const base = (lng ?? 'en').split('-')[0] as AppLanguage;
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(base) ? base : 'en';
};

const syncHtmlLang = (lng: string) => {
  const l = resolveAppLanguage(lng);
  document.documentElement.lang = l;
  document.documentElement.dir = RTL_LANGUAGES.includes(l) ? 'rtl' : 'ltr';
};
syncHtmlLang(i18n.resolvedLanguage ?? 'en');
i18n.on('languageChanged', syncHtmlLang);

export const currentLanguage = (): AppLanguage => resolveAppLanguage(i18n.resolvedLanguage);

/** Language used for server-side documents (PDF reports, AI summary): Bangla or English. */
export const documentLanguage = (): 'en' | 'bn' => (currentLanguage() === 'bn' ? 'bn' : 'en');

export default i18n;
