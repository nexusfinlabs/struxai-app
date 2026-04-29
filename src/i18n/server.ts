// ============================================================
// Server-side helpers para i18n
// ============================================================
// Lee el locale desde la cookie y devuelve un t() que server
// components pueden usar sin contexto React.
// ============================================================

import { cookies } from "next/headers";
import {
  LOCALE_COOKIE,
  DEFAULT_LOCALE,
  MESSAGES,
  isSupportedLocale,
  resolveKey,
  type Locale,
} from "./index";

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isSupportedLocale(fromCookie)) return fromCookie;
  return DEFAULT_LOCALE;
}

export async function getServerT() {
  const locale = await getServerLocale();
  const messages = MESSAGES[locale] || MESSAGES[DEFAULT_LOCALE];
  return {
    locale,
    t: (key: string) => resolveKey(messages, key),
  };
}
