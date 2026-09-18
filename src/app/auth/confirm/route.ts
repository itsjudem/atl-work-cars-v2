import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing point for invite and password-reset emails. The Supabase email
 * templates link here with ?token_hash=…&type=invite|recovery. Verifying the
 * token signs the person in (cookies set on this response), then they choose a
 * password on /admin/set-password/.
 */
const ALLOWED: EmailOtpType[] = ["invite", "recovery"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  if (!tokenHash || !type || !ALLOWED.includes(type)) redirect("/admin/login/?error=link");

  const supabase = await createClient();
  if (!supabase) redirect("/admin/login/?error=config");

  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) redirect("/admin/login/?error=link");

  redirect("/admin/set-password/");
}
