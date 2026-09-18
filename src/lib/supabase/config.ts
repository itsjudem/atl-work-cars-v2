/**
 * Supabase connection settings. The URL and publishable key are public (they
 * reach the browser only because the login cookies are set against them); the
 * secret key is read ONLY in src/lib/supabase/admin.ts, which is server-only.
 *
 * When the variables are missing (e.g. a deploy without Supabase configured),
 * the public site keeps working and the admin shows "not configured".
 */
export interface SupabasePublicConfig {
  url: string;
  publishableKey: string;
}

export function getSupabaseConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}
