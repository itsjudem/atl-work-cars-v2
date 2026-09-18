import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Flash } from "@/components/admin/Flash";
import { LeadBadge } from "@/components/admin/LeadBadge";
import { countyOptions } from "@/data/form-options";
import { formatPhone } from "@/lib/format";
import { NO_PERMISSION } from "@/lib/admin/errors";
import { type SearchParams, UUID } from "@/lib/admin/nav";
import { can } from "@/lib/admin/roles";
import { requireStaff } from "@/lib/admin/session";
import { createClient } from "@/lib/supabase/server";
import { createContactFromApplication, linkContact } from "../../actions";

export const metadata: Metadata = { title: { absolute: "Create contact | ATL Work Cars Admin" } };

const input = "mt-1.5 block min-h-12 w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-ink";

interface Match {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  lead_category: string;
}

/** Pre-filled from the application. Existing contacts with the same phone or email are offered first. */
export default async function CreateContact({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const me = await requireStaff(`/admin/applications/${id}/create-contact/`);
  const sp = await searchParams;
  if (!can.workApplications(me.role)) {
    return <p className="rounded-xl border border-line bg-surface p-4">{NO_PERMISSION}</p>;
  }

  const supabase = await createClient();
  if (!supabase) notFound();
  const { data } = await supabase
    .from("applications")
    .select("id, reference, first_name, last_name, phone, email, zip, county")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const app = data as { id: string; reference: string; first_name: string; last_name: string; phone: string; email: string; zip: string; county: string };

  const { data: dupes } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, phone, email, lead_category")
    .or(`phone.eq.${app.phone},email.eq.${app.email}`)
    .limit(10);
  const matches = (dupes ?? []) as Match[];

  return (
    <>
      <p><Link href={`/admin/applications/${id}/`} className="inline-flex min-h-11 items-center font-semibold">← Back to application {app.reference}</Link></p>
      <h1 className="text-4xl font-bold">Create a contact</h1>
      <p className="mt-2 text-ink-soft">Filled in from the application. The new contact will be linked to it.</p>
      <Flash params={sp} />

      {matches.length ? (
        <section aria-labelledby="dupes" className="mt-6 rounded-xl border-2 border-caution bg-caution-soft p-5">
          <h2 id="dupes" className="text-xl font-bold text-caution">A contact with the same phone or email already exists</h2>
          <p className="mt-1">Link the application to them instead of creating a duplicate?</p>
          <ul className="mt-3 grid gap-2">
            {matches.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface p-3">
                <span>
                  <span className="font-semibold">{m.first_name} {m.last_name}</span> <LeadBadge category={m.lead_category} />
                  <span className="block text-sm text-ink-soft">{[m.phone ? formatPhone(m.phone) : null, m.email].filter(Boolean).join(" · ")}</span>
                </span>
                <form action={linkContact}>
                  <input type="hidden" name="id" value={app.id} />
                  <input type="hidden" name="contact_id" value={m.id} />
                  <button type="submit" className="btn-primary min-h-11 py-2">Link to this contact</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <form action={createContactFromApplication} className="mt-6 grid gap-5 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2 sm:p-6">
        <input type="hidden" name="id" value={app.id} />
        <div>
          <label htmlFor="first_name" className="block font-semibold">First name</label>
          <input id="first_name" name="first_name" defaultValue={app.first_name} required maxLength={50} className={input} />
        </div>
        <div>
          <label htmlFor="last_name" className="block font-semibold">Last name</label>
          <input id="last_name" name="last_name" defaultValue={app.last_name} required maxLength={50} className={input} />
        </div>
        <div>
          <label htmlFor="phone" className="block font-semibold">Phone</label>
          <input id="phone" name="phone" type="tel" defaultValue={formatPhone(app.phone)} className={input} />
        </div>
        <div>
          <label htmlFor="email" className="block font-semibold">Email</label>
          <input id="email" name="email" type="email" defaultValue={app.email} className={input} />
        </div>
        <div>
          <label htmlFor="zip" className="block font-semibold">ZIP code</label>
          <input id="zip" name="zip" inputMode="numeric" maxLength={5} defaultValue={app.zip} className={input} />
        </div>
        <div>
          <label htmlFor="county" className="block font-semibold">County</label>
          <select id="county" name="county" defaultValue={app.county} className={input}>
            <option value="">—</option>
            {countyOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button type="submit" className="btn-primary">{matches.length ? "Create a new contact anyway" : "Create contact"}</button>
          <Link href={`/admin/applications/${id}/`} className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </>
  );
}
