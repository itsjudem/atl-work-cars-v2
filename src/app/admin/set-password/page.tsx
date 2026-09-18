import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard, inputClass, Notice } from "@/components/admin/AuthCard";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/admin/password";
import { createClient } from "@/lib/supabase/server";
import { setPassword } from "../actions";

export const metadata: Metadata = { title: { absolute: "Set your password | ATL Work Cars Admin" } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const errors: Record<string, string> = {
  length: `Use between ${PASSWORD_MIN} and ${PASSWORD_MAX} characters.`,
  match: "The two passwords don't match.",
  same: "Choose a different password from your current one.",
  weak: "That password is too easy to guess. Try a longer one.",
  failed: "We couldn't save your password. Please try again.",
};

/** Used for both invites and password resets (reached from /auth/confirm/). */
export default async function SetPasswordPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data } = supabase ? await supabase.auth.getClaims() : { data: null };
  if (!data?.claims?.sub) redirect("/admin/login/?error=link");

  const error = (await searchParams).error;
  return (
    <AuthCard title="Set your password">
      <p className="mt-3 text-ink-soft">Choose a password of at least {PASSWORD_MIN} characters.</p>
      {typeof error === "string" && errors[error] ? <Notice tone="error">{errors[error]}</Notice> : null}
      <form action={setPassword} className="mt-6 grid gap-5">
        <div>
          <label htmlFor="password" className="block font-semibold">New password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={PASSWORD_MIN} maxLength={PASSWORD_MAX} required className={inputClass} />
        </div>
        <div>
          <label htmlFor="confirm" className="block font-semibold">Confirm new password</label>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={PASSWORD_MIN} maxLength={PASSWORD_MAX} required className={inputClass} />
        </div>
        <button type="submit" className="btn-primary">Save password</button>
      </form>
    </AuthCard>
  );
}
