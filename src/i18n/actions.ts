"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, isSupportedLocale, type Locale } from "./index";
import { createClient } from "@/lib/supabase/server";

/**
 * Cambia el idioma de la app.
 *  - Guarda cookie `struxai-locale` (1 año).
 *  - Si hay user logueado, persiste en user_settings.language.
 *  - Revalida la layout para que server components recojan el cambio.
 */
export async function setLocaleAction(locale: Locale) {
  if (!isSupportedLocale(locale)) {
    return { ok: false as const, error: "Idioma no soportado." };
  }
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  // Persistir en user_settings (si hay sesión)
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("user_settings")
        .upsert({ user_id: user.id, language: locale });
    }
  } catch {
    // sin sesión o error — la cookie es suficiente
  }

  revalidatePath("/", "layout");
  return { ok: true as const };
}
