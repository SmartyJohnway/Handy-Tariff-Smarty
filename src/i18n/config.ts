import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector, { type DetectorOptions } from 'i18next-browser-languagedetector';
import { resources } from '@/i18n/resources';

const detectionOptions: DetectorOptions = {
  order: ['querystring', 'localStorage', 'cookie', 'navigator'],
  caches: ['localStorage', 'cookie'],
  lookupQuerystring: 'lng',
  lookupLocalStorage: 'lng',
  lookupCookie: 'lng',
  cookieMinutes: 60 * 24 * 30, // 30 days
};

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    defaultNS: 'common',
    ns: ['common'],
    lng: 'zh-TW',
    fallbackLng: 'zh-TW',
    supportedLngs: ['zh-TW', 'en'],
    interpolation: {
      escapeValue: false,
    },
    detection: detectionOptions,
    returnNull: false,
    react: {
      useSuspense: true,
    },
  });

export default i18n;
