import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard, inputClass, Notice } from "@/components/admin/AuthCard";
import { lookupStaff, safeAdminPath } from "@/lib/admin/session";
import { signIn } from "../actions";

export const metadata: Metadata = { title: { absolute: "Log in | ATL Work Cars Admin" } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const one = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : undefined);
  const next = safeAdminPath(one("next"));

  const who = await lookupStaff();
  if (who.status === "ok") redirect(next);

  const error = one("error");
  const reason = one("reason");

  return (
    <AuthCard title="Staff log in">
      {who.status === "unconfigured" || error === "config" ? (
        <Notice tone="error">The admin isn&apos;t connected to the database yet. Add the Supabase environment variables and redeploy.</Notice>
      ) : null}
      {error === "1" ? <Notice tone="error">That email and password combination didn&apos;t work. Please try again.</Notice> : null}
      {error === "link" ? <Notice tone="error">That link is invalid or has expired. Ask for a new one, and open it in the same browser you requested it from.</Notice> : null}
      {reason === "inactive" ? <Notice tone="error">Your admin access has been turned off. Contact an Owner if you think this is a mistake.</Notice> : null}
      {one("signed_out") ? <Notice tone="success">You&apos;ve been logged out.</Notice> : null}

      <form action={signIn} className="mt-6 grid gap-5">
        <input type="hidden" name="next" value={next} />
        <div>
          <label htmlFor="email" className="block font-semibold">Email</label>
          <input id="email" name="email" type="email" autoComplete="username" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="password" className="block font-semibold">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
        </div>
        <button type="submit" className="btn-primary">Log in</button>
      </form>
      <p className="mt-5">
        <Link href="/admin/forgot-password/" className="inline-flex min-h-11 items-center font-semibold">Forgot password?</Link>
      </p>
    </AuthCard>
  );
}
