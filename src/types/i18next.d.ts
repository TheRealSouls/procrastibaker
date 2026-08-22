import "i18next";
import type en from "../i18n/locales/en.json";

// Type-safe translation keys: t("bad.key") becomes a compile error and valid
// keys autocomplete. Keeps en.json and every t() call in sync at build time.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: {
      translation: typeof en;
    };
  }
}
