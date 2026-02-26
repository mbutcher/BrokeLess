import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCA from './locales/en-CA.json';
import enUS from './locales/en-US.json';
import frCA from './locales/fr-CA.json';

void i18n.use(initReactI18next).init({
  lng: 'en-CA',
  fallbackLng: 'en-CA',
  resources: {
    'en-CA': { translation: enCA },
    'en-US': { translation: enUS },
    'fr-CA': { translation: frCA },
  },
  interpolation: { escapeValue: false },
});

export default i18n;
