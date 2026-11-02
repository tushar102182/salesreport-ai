import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import bn from './locales/bn.json';
import en from './locales/en.json';

export const SUPPORTED_LANGUAGES = ['en', 'bn'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, bn: { translation: bn } },
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

const syncHtmlLang = (lng: string) => {
  document.documentElement.lang = lng.startsWith('bn') ? 'bn' : 'en';
};
syncHtmlLang(i18n.resolvedLanguage ?? 'en');
i18n.on('languageChanged', syncHtmlLang);

export const currentLanguage = (): AppLanguage => (i18n.resolvedLanguage?.startsWith('bn') ? 'bn' : 'en');

export default i18n;
