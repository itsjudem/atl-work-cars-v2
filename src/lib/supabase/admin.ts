import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./config";

/**
 * A Supabase client using the SECRET key. It bypasses row-level security, so it
 * is used for exactly three things:
 *   1. saving public form submissions,
 *   2. reading cars for the public website (public_vehicles view),
 *   3. inviting / deactivating / reactivating staff AFTER confirming the
 *      requester is an active Owner.
 * Everything else in the admin uses createClient() from ./server.
 *
 * `import "server-only"` makes any accidental import from browser code fail the build.
 */
export function createAdminClient() {
  const config = getSupabaseConfig();
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!config || !secretKey) return null;
  return createClient(config.url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
