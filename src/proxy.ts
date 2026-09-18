import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

/**
 * Runs before every /admin and /auth request:
 *  1. refreshes the login session and writes updated cookies,
 *  2. sends logged-out visitors to /admin/login/ (and back afterwards).
 * The real permission checks happen on the server in each page and action
 * (getClaims + a fresh profile read) and in the database itself.
 */
const PUBLIC_ADMIN_PATHS = ["/admin/login/", "/admin/forgot-password/", "/admin/set-password/"];

export async function proxy(request: NextRequest) {
  const config = getSupabaseConfig();
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");
  if (!config) return response;

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet, headers) {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        response.headers.set("Cache-Control", "private, no-store");
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
      },
    },
  });

  // Must run before any other logic so a refreshed token is written back.
  const { data } = await supabase.auth.getClaims();
  const loggedIn = Boolean(data?.claims?.sub);

  const path = request.nextUrl.pathname.endsWith("/") ? request.nextUrl.pathname : `${request.nextUrl.pathname}/`;
  const isAdmin = path.startsWith("/admin/");
  const isPublicAdmin = PUBLIC_ADMIN_PATHS.some((p) => path === p);

  if (isAdmin && !isPublicAdmin && !loggedIn) {
    const login = request.nextUrl.clone();
    login.pathname = "/admin/login/";
    login.search = "";
    login.searchParams.set("next", path);
    const redirect = NextResponse.redirect(login);
    redirect.headers.set("Cache-Control", "private, no-store");
    for (const c of response.cookies.getAll()) redirect.cookies.set(c);
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/admin", "/auth/:path*"],
};
