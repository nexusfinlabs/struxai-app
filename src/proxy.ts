import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              maxAge: 60 * 60 * 24 * 90,
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
              httpOnly: true,
            })
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAppRoute = path.startsWith("/app");

  // Solo bloqueamos rutas /app sin sesión.
  // /login y /signup SIEMPRE se renderizan — la página decide si mostrar
  // formulario o "account picker" cuando ya hay cookie. Esto permite
  // cambiar de cuenta sin tener que hacer logout primero desde dentro.
  if (!user && isAppRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Email no confirmado -> /verify-email (solo para rutas /app, OAuth exento)
  if (user && isAppRoute) {
    const isOAuthUser = (user.app_metadata?.provider || "email") !== "email";
    const emailConfirmed = !!user.email_confirmed_at || isOAuthUser;
    if (!emailConfirmed) {
      const url = request.nextUrl.clone();
      url.pathname = "/verify-email";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
