import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Load translations (we keep small initial sets — extend as needed)
import en from './locales/en.json';
import vi from './locales/vi.json';

const resources = {
  en: { translation: en },
  vi: { translation: vi },
};

const saved = typeof window !== 'undefined' ? localStorage.getItem('app_lang') : null;
const defaultLng = saved || (navigator.language && navigator.language.startsWith('vi') ? 'vi' : 'en');

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLng,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: { useSuspense: false },
  })
  .catch((e) => console.warn('i18n init failed', e));

export default i18n;
