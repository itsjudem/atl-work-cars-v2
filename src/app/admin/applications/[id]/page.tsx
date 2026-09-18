import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Flash } from "@/components/admin/Flash";
import { History } from "@/components/admin/History";
import { LeadBadge } from "@/components/admin/LeadBadge";
import { Notes } from "@/components/admin/Notes";
import { formatPhone } from "@/lib/format";
import { one, type SearchParams, searchTerm, UUID } from "@/lib/admin/nav";
import { can } from "@/lib/admin/roles";
import { requireStaff } from "@/lib/admin/session";
import { formatAtlanta } from "@/lib/admin/time";
import { createClient } from "@/lib/supabase/server";
import {
  addApplicationNote,
  deleteApplication,
  deleteApplicationNote,
  linkContact,
  setArchived,
  setContacted,
} from "../actions";

export const metadata: Metadata = { title: { absolute: "Application | ATL Work Cars Admin" } };

interface App {
  id: string;
  reference: string;
  submitted_at: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  zip: string;
  county: string;
  primary_use: string;
  platforms: string | null;
  platform_status: string;
  urgency: string;
  age: number;
  has_license: boolean;
  license_state: string | null;
  has_vehicle: boolean;
  preferred_vehicle_type: string | null;
  pickup_area: string | null;
  consent: boolean;
  applicant_notes: string | null;
  vehicle_id: string | null;
  vehicle_label: string | null;
  contacted: boolean;
  contacted_at: string | null;
  archived_at: string | null;
  contact: { id: string; first_name: string; last_name: string; lead_category: string } | null;
  contacted_by_profile: { full_name: string } | null;
}

interface ContactMatch {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  lead_category: string;
}

const yesNo = (b: boolean) => (b ? "Yes" : "No");

export default async function ApplicationDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const me = await requireStaff(`/admin/applications/${id}/`);
  const sp = await searchParams;
  const supabase = await createClient();
  if (!supabase) notFound();

  const { data } = await supabase
    .from("applications")
    .select("*, contact:contacts(id, first_name, last_name, lead_category), contacted_by_profile:profiles(full_name)")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const app = data as unknown as App;

  const mayWork = can.workApplications(me.role);
  const mayDelete = can.deleteAnything(me.role);
  const confirmDelete = one(sp, "confirm") === "delete" && mayDelete;

  // "Link to an existing contact" search.
  const cq = searchTerm(one(sp, "cq"));
  let matches: ContactMatch[] = [];
  if (mayWork && cq) {
    let query = supabase.from("contacts").select("id, first_name, last_name, phone, email, lead_category").is("archived_at", null);
    for (const word of cq.split(" ").filter(Boolean)) {
      const digits = word.replace(/\D/g, "");
      const ors = [`first_name.ilike.*${word}*`, `last_name.ilike.*${word}*`, `email.ilike.*${word}*`];
      if (digits.length >= 3) ors.push(`phone.like.*${digits}*`);
      query = query.or(ors.join(","));
    }
    const { data: found } = await query.order("created_at", { ascending: false }).limit(10);
    matches = (found ?? []) as ContactMatch[];
  }

  const answers: [string, string][] = [
    ["Reference", app.reference],
    ["Submitted", formatAtlanta(app.submitted_at)],
    ["Name", `${app.first_name} ${app.last_name}`],
    ["Phone", formatPhone(app.phone)],
    ["Email", app.email],
    ["ZIP code", app.zip],
    ["County", app.county],
    ["Primary use", app.primary_use],
    ["Platforms", app.platforms ?? "—"],
    ["Active on those platforms?", app.platform_status],
    ["How soon", app.urgency],
    ["Age", String(app.age)],
    ["Valid driver's license", yesNo(app.has_license)],
    ["State issuing license", app.license_state ?? "—"],
    ["Currently has a vehicle", yesNo(app.has_vehicle)],
    ["Preferred vehicle type", app.preferred_vehicle_type ?? "—"],
    ["Preferred pickup area", app.pickup_area ?? "—"],
    ["Additional notes", app.applicant_notes ?? "—"],
    ["Agreed to be contacted", yesNo(app.consent)],
  ];

  return (
    <>
      <p><Link href="/admin/applications/" className="inline-flex min-h-11 items-center font-semibold">← All applications</Link></p>
      <h1 className="text-4xl font-bold">{app.first_name} {app.last_name}</h1>
      <p className="mt-1 text-ink-soft">
        {app.reference} · {app.archived_at ? <strong className="text-caution">Archived</strong> : "Active"} ·{" "}
        {app.contacted ? `Contacted ${formatAtlanta(app.contacted_at)}${app.contacted_by_profile ? ` by ${app.contacted_by_profile.full_name}` : ""}` : <strong className="text-danger">Not contacted</strong>}
      </p>
      <Flash params={sp} />

      {mayWork ? (
        <div className="mt-5 flex flex-wrap gap-2">
          <form action={setContacted}>
            <input type="hidden" name="id" value={app.id} />
            <input type="hidden" name="value" value={app.contacted ? "false" : "true"} />
            <button type="submit" className={app.contacted ? "btn-secondary" : "btn-primary"}>{app.contacted ? "Mark not contacted" : "Mark contacted"}</button>
          </form>
          <form action={setArchived}>
            <input type="hidden" name="id" value={app.id} />
            <input type="hidden" name="value" value={app.archived_at ? "false" : "true"} />
            <button type="submit" className="btn-secondary">{app.archived_at ? "Restore" : "Archive"}</button>
          </form>
          {mayDelete && !confirmDelete ? (
            <Link href={`/admin/applications/${app.id}/?confirm=delete`} className="btn-secondary border-danger text-danger">Delete…</Link>
          ) : null}
        </div>
      ) : null}

      {confirmDelete ? (
        <div role="alertdialog" aria-labelledby="del-title" className="mt-5 rounded-xl border-2 border-danger bg-surface p-5">
          <h2 id="del-title" className="text-xl font-bold">Delete application {app.reference} from {app.first_name} {app.last_name}?</h2>
          <p className="mt-2 text-ink-soft">This permanently deletes the application and its notes. It can&apos;t be undone.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={deleteApplication}>
              <input type="hidden" name="id" value={app.id} />
              <input type="hidden" name="confirm" value="yes" />
              <button type="submit" className="btn bg-danger text-white">Delete permanently</button>
            </form>
            <Link href={`/admin/applications/${app.id}/`} className="btn-secondary">Cancel</Link>
          </div>
        </div>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="answers">
          <h2 id="answers" className="text-2xl font-bold">Answers</h2>
          <p className="text-sm text-ink-soft">A record of what was submitted. Answers can&apos;t be edited — update the linked contact instead.</p>
          <dl className="mt-3 divide-y divide-line rounded-xl border border-line bg-surface">
            {answers.map(([k, v]) => (
              <div key={k} className="grid gap-1 px-4 py-3 sm:grid-cols-[13rem_1fr]">
                <dt className="font-semibold">{k}</dt>
                <dd className="whitespace-pre-wrap break-words">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="grid content-start gap-6">
          <section aria-labelledby="car" className="rounded-xl border border-line bg-surface p-4">
            <h2 id="car" className="text-xl font-bold">Car applied for</h2>
            <p className="mt-1">
              {app.vehicle_label ?? "General application (no specific car)"}
              {app.vehicle_label && !app.vehicle_id ? <span className="block text-sm text-ink-soft">That car has since been deleted.</span> : null}
            </p>
          </section>

          <section aria-labelledby="contact" className="rounded-xl border border-line bg-surface p-4">
            <h2 id="contact" className="text-xl font-bold">Linked contact</h2>
            {app.contact ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Link href={`/admin/contacts/${app.contact.id}/`} className="font-semibold">{app.contact.first_name} {app.contact.last_name}</Link>
                <LeadBadge category={app.contact.lead_category} />
                {mayWork ? (
                  <form action={linkContact}>
                    <input type="hidden" name="id" value={app.id} />
                    <input type="hidden" name="contact_id" value="" />
                    <button type="submit" className="min-h-11 px-2 text-sm font-semibold text-brand underline-offset-4 hover:underline">Unlink</button>
                  </form>
                ) : null}
              </div>
            ) : (
              <p className="mt-1 text-ink-soft">Not linked to a contact yet.</p>
            )}

            {mayWork ? (
              <>
                <Link href={`/admin/applications/${app.id}/create-contact/`} className="btn-primary mt-4 w-full">Create contact from this application</Link>
                <form method="get" className="mt-4">
                  <label htmlFor="cq" className="text-sm font-semibold">Link to an existing contact</label>
                  <div className="mt-1 flex gap-2">
                    <input id="cq" name="cq" defaultValue={cq} placeholder="Name, phone or email" className="block min-h-11 w-full rounded-lg border border-line bg-surface px-3" />
                    <button type="submit" className="btn-secondary min-h-11 px-4 py-2">Search</button>
                  </div>
                </form>
                {cq ? (
                  matches.length ? (
                    <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
                      {matches.map((m) => (
                        <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                          <span>
                            <span className="font-semibold">{m.first_name} {m.last_name}</span>
                            <span className="block text-sm text-ink-soft">{[m.phone ? formatPhone(m.phone) : null, m.email].filter(Boolean).join(" · ")}</span>
                          </span>
                          <form action={linkContact}>
                            <input type="hidden" name="id" value={app.id} />
                            <input type="hidden" name="contact_id" value={m.id} />
                            <button type="submit" className="btn-secondary min-h-11 px-4 py-2">Link</button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-ink-soft">No contacts match.</p>
                  )
                ) : null}
              </>
            ) : null}
          </section>
        </div>
      </div>

      <Notes parent="application_id" parentId={app.id} canAdd={mayWork} canDelete={mayDelete} addAction={addApplicationNote} deleteAction={deleteApplicationNote} />
      <History recordType="application" recordId={app.id} />
    </>
  );
}
