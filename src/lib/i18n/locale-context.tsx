"use client";

import * as React from "react";

export type Locale = "id" | "en";

const STORAGE_KEY = "locale";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = React.createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // Mulai sama dengan SSR ("id") supaya tidak hydration mismatch; locale
  // tersimpan dibaca setelah mount (client-only), bisa flash 1 frame ID->EN.
  const [locale, setLocaleState] = React.useState<Locale>("id");

  React.useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "id") setLocaleState(saved);
  }, []);

  React.useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = React.useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = React.useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

const FALLBACK_LOCALE: LocaleContextValue = {
  locale: "id",
  setLocale: () => {},
};

/**
 * Falls back to Indonesian (no-op setter) outside LocaleProvider — some
 * shared components (e.g. states.tsx) are also used from admin pages that
 * Next.js statically prerenders without the full provider tree in scope.
 */
export function useLocale(): LocaleContextValue {
  const ctx = React.useContext(LocaleContext);
  return ctx ?? FALLBACK_LOCALE;
}
