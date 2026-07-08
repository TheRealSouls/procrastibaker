import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";

// English-only today, but the plumbing (detection + persistence) is wired so a
// language switcher and extra locale files can be added later with no refactor.
// `supportedLngs: ["en"]` means detection always resolves to English for now.
export const defaultNS = "translation";
export const resources = { en: { translation: en } } as const;

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    defaultNS,
    fallbackLng: "en",
    supportedLngs: ["en"],
    interpolation: { escapeValue: false }, // React already escapes
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "procrastibaker-lang",
    },
    react: { useSuspense: false }, // resources are bundled synchronously
  });

export default i18n;
