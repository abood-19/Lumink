"use client";

import { createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, type Dict, type Locale } from "./index";

type Ctx = { t: Dict; locale: Locale };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ t, locale, children }: Ctx & { children: React.ReactNode }) {
  return <I18nContext.Provider value={{ t, locale }}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

export function useSetLocale() {
  const router = useRouter();
  return (locale: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };
}
