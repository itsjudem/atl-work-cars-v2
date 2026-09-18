import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./config";

/**
 * A Supabase client acting AS THE LOGGED-IN STAFF MEMBER, so the database's
 * row-level security applies. Create a new one for every request.
 * Returns null when Supabase isn't configured.
 */
export async function createClient() {
  const config = getSupabaseConfig();
  if (!config) return null;
  const cookieStore = await cookies();
  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component, which can't set cookies. The proxy
          // refreshes the session on every /admin request, so this is safe to ignore.
        }
      },
    },
  });
}
