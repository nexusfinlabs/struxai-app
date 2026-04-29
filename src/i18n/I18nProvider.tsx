"use client";

import { createContext, useContext, useMemo } from "react";
import { MESSAGES, DEFAULT_LOCALE, type Locale, resolveKey } from "./index";

type I18nContextValue = {
  locale: Locale;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const value = useMemo<I18nContextValue>(() => {
    const messages = MESSAGES[locale] || MESSAGES[DEFAULT_LOCALE];
    return {
      locale,
      t: (key: string) => resolveKey(messages, key),
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback silencioso en lugar de throw para evitar romper SSR de
    // componentes anidados antes de que el provider monte.
    return { locale: DEFAULT_LOCALE as Locale, t: (k: string) => k };
  }
  return ctx;
}
