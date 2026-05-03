import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Proxy de Next.js 16 (antes "middleware"). Refresca la sesión de
// Supabase en cada request y aplica las redirecciones de auth.
//
// IMPORTANTE: Las cookies que escribe Supabase deben preservar las
// `options` originales que vienen de @supabase/ssr. Si las pisamos
// con `httpOnly: true` o un `maxAge` arbitrario, el cliente del
// navegador (createBrowserClient) deja de poder leerlas y la
// sesión se pierde tras la primera navegación. Era el bug que
// rompía login en localhost:3000.
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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: getUser() debe llamarse antes de cualquier lógica
  // que dependa de la sesión, porque también dispara el refresco
  // del token de acceso.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAppRoute = path.startsWith("/app");

  if (!user && isAppRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Email no confirmado -> /verify-email (solo /app, OAuth exento)
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
  // Excluimos assets estáticos y la ruta /auth/callback (la maneja
  // su propio Route Handler que ya intercambia el code por sesión).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
