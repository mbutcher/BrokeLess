import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCA from './locales/en-CA.json';

void i18n.use(initReactI18next).init({
  lng: 'en-CA',
  fallbackLng: 'en-CA',
  resources: {
    'en-CA': { translation: enCA },
  },
  interpolation: { escapeValue: false },
});

export default i18n;
