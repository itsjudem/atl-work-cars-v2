"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createContact, type NewContactState } from "@/app/admin/contacts/actions";

/**
 * Client component (the reason: keep what staff typed when the server warns
 * about a possible duplicate, so they can choose "Save anyway" without retyping).
 */
const input = "mt-1.5 block min-h-12 w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-ink";

export function NewContactForm({ counties }: { counties: readonly string[] }) {
  const [state, action, pending] = useActionState<NewContactState, FormData>(createContact, {});
  const dupes = state.duplicates ?? [];

  return (
    <form action={action} className="mt-6 grid gap-5 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2 sm:p-6">
      {state.error ? (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/5 p-3 font-medium text-danger sm:col-span-2">
          {state.error}
        </p>
      ) : null}
      {dupes.length ? (
        <div role="alert" className="rounded-xl border-2 border-caution bg-caution-soft p-4 sm:col-span-2">
          <p className="font-bold text-caution">A contact with the same phone or email already exists.</p>
          <ul className="mt-2 grid gap-1">
            {dupes.map((d) => (
              <li key={d.id}>
                <Link href={`/admin/contacts/${d.id}/`} className="font-semibold">Open {d.name}</Link>
                <span className="text-ink-soft"> · {d.detail}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm">If this really is a different person, click <strong>Save anyway</strong>.</p>
          <input type="hidden" name="force" value="yes" />
        </div>
      ) : null}
      <div>
        <label htmlFor="first_name" className="block font-semibold">First name</label>
        <input id="first_name" name="first_name" required maxLength={50} className={input} />
      </div>
      <div>
        <label htmlFor="last_name" className="block font-semibold">Last name</label>
        <input id="last_name" name="last_name" required maxLength={50} className={input} />
      </div>
      <div>
        <label htmlFor="phone" className="block font-semibold">Phone</label>
        <input id="phone" name="phone" type="tel" inputMode="tel" className={input} />
      </div>
      <div>
        <label htmlFor="email" className="block font-semibold">Email</label>
        <input id="email" name="email" type="email" className={input} />
      </div>
      <div>
        <label htmlFor="zip" className="block font-semibold">ZIP code <span className="font-normal text-ink-soft">(optional)</span></label>
        <input id="zip" name="zip" inputMode="numeric" maxLength={5} className={input} />
      </div>
      <div>
        <label htmlFor="county" className="block font-semibold">County <span className="font-normal text-ink-soft">(optional)</span></label>
        <select id="county" name="county" className={input}>
          <option value="">—</option>
          {counties.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <p className="text-sm text-ink-soft sm:col-span-2">A phone number or an email address is required.</p>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button type="submit" disabled={pending} className="btn-primary disabled:opacity-70">
          {pending ? "Saving…" : dupes.length ? "Save anyway" : "Add contact"}
        </button>
        <Link href="/admin/contacts/" className="btn-secondary">Cancel</Link>
      </div>
    </form>
  );
}
