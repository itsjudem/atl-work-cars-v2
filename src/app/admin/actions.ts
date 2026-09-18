"use server";

import { redirect } from "next/navigation";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/admin/password";
import { requestOrigin } from "@/lib/admin/origin";
import { safeAdminPath } from "@/lib/admin/session";
import { createClient } from "@/lib/supabase/server";
import { isValidEmail, normalizeEmail } from "@/lib/validation";

function field(form: FormData, name: string, max = 300): string {
  const v = form.get(name);
  return typeof v === "string" ? v.slice(0, max) : "";
}

/** Email + password. One general message for any failure — never says which was wrong. */
export async function signIn(form: FormData): Promise<void> {
  const next = safeAdminPath(field(form, "next"));
  const email = normalizeEmail(field(form, "email", 254));
  const password = field(form, "password", PASSWORD_MAX);
  const back = `/admin/login/?error=1&next=${encodeURIComponent(next)}`;

  const supabase = await createClient();
  if (!supabase) redirect("/admin/login/?error=config");
  if (!isValidEmail(email) || password.length === 0) redirect(back);

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) redirect(back);

  // A deactivated staff member can't log back in: RLS returns no profile row for them.
  const { data: profile } = await supabase.from("profiles").select("is_active").eq("id", data.user.id).maybeSingle();
  if (!profile?.is_active) {
    await supabase.auth.signOut();
    redirect("/admin/login/?reason=inactive");
  }

  redirect(next);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect("/admin/login/?signed_out=1");
}

/** Always shows the same confirmation, whether or not the email belongs to staff. */
export async function requestPasswordReset(form: FormData): Promise<void> {
  const email = normalizeEmail(field(form, "email", 254));
  const supabase = await createClient();
  if (supabase && isValidEmail(email)) {
    const origin = await requestOrigin();
    // The email template links to {{ .RedirectTo }}?token_hash=…&type=recovery
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/confirm/` });
    if (error) console.error("[admin] password reset request failed", error.status, error.code);
  }
  redirect("/admin/forgot-password/?sent=1");
}

/** New + confirm password for invites and resets. Needs the session set by /auth/confirm. */
export async function setPassword(form: FormData): Promise<void> {
  const password = field(form, "password", PASSWORD_MAX + 1);
  const confirm = field(form, "confirm", PASSWORD_MAX + 1);
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) redirect("/admin/set-password/?error=length");
  if (password !== confirm) redirect("/admin/set-password/?error=match");

  const supabase = await createClient();
  if (!supabase) redirect("/admin/login/?error=config");
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/admin/login/?error=link");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error("[admin] set password failed", error.status, error.code);
    redirect(`/admin/set-password/?error=${error.code === "same_password" ? "same" : error.code === "weak_password" ? "weak" : "failed"}`);
  }
  redirect("/admin/");
}
