import siteRu from "./site.ru.json";
import siteEn from "./site.en.json";
import siteUz from "./site.uz.json";
import siteAr from "./site.ar.json";
import appRu from "./app.ru.json";
import appEn from "./app.en.json";
import appUz from "./app.uz.json";
import appAr from "./app.ar.json";

export const LOCALES = ["ru", "en", "uz", "ar"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ru";
export const LOCALE_COOKIE = "lumink-locale";

type Site = typeof siteEn;
type App = typeof appEn;
export type Dict = Site & App;

const DICTS: Record<Locale, Dict> = {
  ru: { ...(siteRu as Site), ...(appRu as App) },
  en: { ...(siteEn as Site), ...(appEn as App) },
  uz: { ...(siteUz as Site), ...(appUz as App) },
  ar: { ...(siteAr as Site), ...(appAr as App) },
};

export function isLocale(v: string | undefined | null): v is Locale {
  return !!v && (LOCALES as readonly string[]).includes(v);
}

export function getDict(locale: Locale): Dict {
  return DICTS[locale];
}

export function dirOf(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

export const LANGUAGE_NAMES: Record<Locale, string> = {
  ru: "Русский",
  en: "English",
  uz: "O‘zbekcha",
  ar: "العربية",
};
