import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing point for invite and password-reset emails. Two link styles work:
 *
 *  1. Custom templates (needs custom SMTP in Supabase):
 *       {{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=invite|recovery
 *     → verifyOtp.
 *  2. Supabase's DEFAULT templates ({{ .ConfirmationURL }}): Supabase verifies
 *     the link, then sends the browser here with ?code=… (PKCE) → exchange the
 *     code. The code verifier cookie was set when the reset was requested, so
 *     this works in the same browser the request came from.
 *
 * Either way the person is signed in and sent to /admin/set-password/.
 */
const ALLOWED: EmailOtpType[] = ["invite", "recovery"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");

  const supabase = await createClient();
  if (!supabase) redirect("/admin/login/?error=config");

  if (tokenHash && type && ALLOWED.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) redirect("/admin/login/?error=link");
    redirect("/admin/set-password/");
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) redirect("/admin/login/?error=link");
    redirect("/admin/set-password/");
  }

  redirect("/admin/login/?error=link");
}
