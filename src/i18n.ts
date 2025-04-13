import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enTranslation from "./locales/en/translation.json";
import frTranslation from "./locales/fr/translation.json";


i18n.use(initReactI18next).init({
  fallbackLng: "fr",
  interpolation: {
    escapeValue: false,
  },
  resources: {
    en: {
      translation: enTranslation,
    },
    fr: {
      translation: frTranslation,
    },
  },
});

export default i18n;
