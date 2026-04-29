// ============================================================
// STRUXAI i18n - punto de entrada
// ============================================================
// Locales soportados: 'es' (default), 'en', 'de'.
// La selección se persiste en cookie `struxai-locale` y, si el
// usuario está logueado, también en user_settings.language.
// ============================================================

import es from "./messages/es";
import en from "./messages/en";
import de from "./messages/de";
import type { Messages } from "./messages/es";

export const SUPPORTED_LOCALES = ["es", "en", "de"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "es";
export const LOCALE_COOKIE = "struxai-locale";

export const MESSAGES: Record<Locale, Messages> = { es, en, de };

export function isSupportedLocale(value: string | undefined): value is Locale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Resuelve un valor a través del diccionario usando notación punto.
 * Ej: t('nav.profile') → "Mi perfil"
 * Si la clave no existe, devuelve la clave original (para depurar).
 */
export function resolveKey(messages: Messages, key: string): string {
  const parts = key.split(".");
  let cur: any = messages;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) {
      cur = cur[p];
    } else {
      return key;
    }
  }
  return typeof cur === "string" ? cur : key;
}
