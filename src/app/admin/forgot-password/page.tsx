import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard, inputClass, Notice } from "@/components/admin/AuthCard";
import { requestPasswordReset } from "../actions";

export const metadata: Metadata = { title: { absolute: "Forgot password | ATL Work Cars Admin" } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const sent = (await searchParams).sent === "1";
  return (
    <AuthCard title="Reset your password">
      {sent ? (
        // Identical whether or not the email belongs to a staff member.
        <Notice tone="success">If that email belongs to a staff account, a reset link is on its way. Check your inbox.</Notice>
      ) : (
        <p className="mt-3 text-ink-soft">Enter your staff email and we&apos;ll send you a link to set a new password.</p>
      )}
      <form action={requestPasswordReset} className="mt-6 grid gap-5">
        <div>
          <label htmlFor="email" className="block font-semibold">Email</label>
          <input id="email" name="email" type="email" autoComplete="username" required className={inputClass} />
        </div>
        <button type="submit" className="btn-primary">Send reset link</button>
      </form>
      <p className="mt-5">
        <Link href="/admin/login/" className="inline-flex min-h-11 items-center font-semibold">Back to log in</Link>
      </p>
    </AuthCard>
  );
}
