import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Flash } from "@/components/admin/Flash";
import { History } from "@/components/admin/History";
import { LeadBadge } from "@/components/admin/LeadBadge";
import { Notes } from "@/components/admin/Notes";
import { countyOptions } from "@/data/form-options";
import { formatPhone } from "@/lib/format";
import { findDuplicates } from "@/lib/admin/duplicates";
import { isLeadCategory, leadInfo } from "@/lib/admin/lead";
import { one, type SearchParams, UUID } from "@/lib/admin/nav";
import { can } from "@/lib/admin/roles";
import { requireStaff } from "@/lib/admin/session";
import { formatAtlanta } from "@/lib/admin/time";
import { createClient } from "@/lib/supabase/server";
import {
  addContactNote,
  deleteContact,
  deleteContactNote,
  saveContactDetails,
  setContactArchived,
  setContactContacted,
  setRating,
} from "../actions";

export const metadata: Metadata = { title: { absolute: "Contact | ATL Work Cars Admin" } };

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  zip: string | null;
  county: string | null;
  source: string;
  original_message: string | null;
  fit: "high" | "low" | null;
  intent: "high" | "low" | null;
  lead_category: string;
  contacted: boolean;
  contacted_at: string | null;
  archived_at: string | null;
  created_at: string;
  contacted_by_profile: { full_name: string } | null;
  renting: { id: string; code: string; year: number; make: string; model: string; trim: string | null; rented_since: string | null }[];
  applications: { id: string; reference: string; submitted_at: string; vehicle_label: string | null }[];
}

const sourceLabels: Record<string, string> = { contact_form: "Contact form", application: "Application", manual: "Added by staff" };
const input = "mt-1.5 block min-h-12 w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-ink disabled:bg-surface-muted";

export default async function ContactDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const me = await requireStaff(`/admin/contacts/${id}/`);
  const sp = await searchParams;
  const supabase = await createClient();
  if (!supabase) notFound();

  const { data } = await supabase
    .from("contacts")
    .select(
      "*, contacted_by_profile:profiles(full_name), renting:vehicles(id, code, year, make, model, trim, rented_since), applications(id, reference, submitted_at, vehicle_label)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const c = data as unknown as Contact;

  const mayEdit = can.editContacts(me.role);
  const mayNote = can.noteContacts(me.role);
  const mayDelete = can.deleteAnything(me.role);
  const confirmDelete = one(sp, "confirm") === "delete" && mayDelete;
  const confirmArchive = one(sp, "confirm") === "archive" && mayEdit;
  const offerArchive = one(sp, "offer") === "archive" && mayEdit && !c.archived_at && c.lead_category === "dead";
  const renting = c.renting ?? [];
  const carName = (v: Contact["renting"][number]) => [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");
  const dupes = await findDuplicates(supabase, c.phone, c.email, c.id);
  const category = isLeadCategory(c.lead_category) ? c.lead_category : "unrated";

  return (
    <>
      <p><Link href="/admin/contacts/" className="inline-flex min-h-11 items-center font-semibold">← All contacts</Link></p>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-4xl font-bold">{c.first_name} {c.last_name}</h1>
        <LeadBadge category={c.lead_category} />
      </div>
      <p className="mt-1 text-ink-soft">
        {sourceLabels[c.source] ?? c.source} · added {formatAtlanta(c.created_at)} · {c.archived_at ? <strong className="text-caution">Archived</strong> : "Active"} ·{" "}
        {c.contacted ? `Contacted ${formatAtlanta(c.contacted_at)}${c.contacted_by_profile ? ` by ${c.contacted_by_profile.full_name}` : ""}` : <strong className="text-danger">Not contacted</strong>}
      </p>
      <Flash params={sp} />

      {offerArchive ? (
        <div role="alertdialog" aria-labelledby="dead-title" className="mt-5 rounded-xl border-2 border-line bg-surface p-5">
          <h2 id="dead-title" className="text-xl font-bold">This is now a Dead lead. Archive this contact?</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={setContactArchived}>
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="value" value="true" />
              <button type="submit" className="btn-primary">Archive this contact</button>
            </form>
            <Link href={`/admin/contacts/${c.id}/`} className="btn-secondary">Keep active</Link>
          </div>
        </div>
      ) : null}

      {mayEdit ? (
        <div className="mt-5 flex flex-wrap gap-2">
          <form action={setContactContacted}>
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="value" value={c.contacted ? "false" : "true"} />
            <button type="submit" className={c.contacted ? "btn-secondary" : "btn-primary"}>{c.contacted ? "Mark not contacted" : "Mark contacted"}</button>
          </form>
          {c.archived_at || !renting.length ? (
            <form action={setContactArchived}>
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="value" value={c.archived_at ? "false" : "true"} />
              <button type="submit" className="btn-secondary">{c.archived_at ? "Restore" : "Archive"}</button>
            </form>
          ) : (
            <Link href={`/admin/contacts/${c.id}/?confirm=archive`} className="btn-secondary">Archive…</Link>
          )}
          {mayDelete && !confirmDelete ? <Link href={`/admin/contacts/${c.id}/?confirm=delete`} className="btn-secondary border-danger text-danger">Delete…</Link> : null}
        </div>
      ) : null}

      {confirmArchive && renting.length ? (
        <div role="alertdialog" aria-labelledby="arch-title" className="mt-5 rounded-xl border-2 border-caution bg-caution-soft p-5">
          <h2 id="arch-title" className="text-xl font-bold text-caution">{c.first_name} is currently renting {renting.map(carName).join(", ")}.</h2>
          <p className="mt-1">Archive them anyway? They stay the renter until the car&apos;s status changes.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={setContactArchived}>
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="value" value="true" />
              <button type="submit" className="btn-primary">Archive anyway</button>
            </form>
            <Link href={`/admin/contacts/${c.id}/`} className="btn-secondary">Cancel</Link>
          </div>
        </div>
      ) : null}

      {confirmDelete ? (
        <div role="alertdialog" aria-labelledby="del-title" className="mt-5 rounded-xl border-2 border-danger bg-surface p-5">
          <h2 id="del-title" className="text-xl font-bold">Delete contact {c.first_name} {c.last_name}?</h2>
          {renting.length ? (
            <p className="mt-2 font-semibold text-danger">Remove them as the renter of {renting.map(carName).join(", ")} first.</p>
          ) : (
            <>
              <p className="mt-2 text-ink-soft">This permanently deletes the contact and their notes. Linked applications are kept but unlinked. It can&apos;t be undone.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <form action={deleteContact}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="confirm" value="yes" />
                  <button type="submit" className="btn bg-danger text-white">Delete permanently</button>
                </form>
                <Link href={`/admin/contacts/${c.id}/`} className="btn-secondary">Cancel</Link>
              </div>
            </>
          )}
        </div>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid content-start gap-8">
          <section aria-labelledby="details">
            <h2 id="details" className="text-2xl font-bold">Details</h2>
            <form action={saveContactDetails} className="mt-3 grid gap-4 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2">
              <input type="hidden" name="id" value={c.id} />
              <fieldset disabled={!mayEdit} className="contents">
                <div>
                  <label htmlFor="first_name" className="block font-semibold">First name</label>
                  <input id="first_name" name="first_name" defaultValue={c.first_name} required maxLength={50} className={input} />
                </div>
                <div>
                  <label htmlFor="last_name" className="block font-semibold">Last name</label>
                  <input id="last_name" name="last_name" defaultValue={c.last_name} required maxLength={50} className={input} />
                </div>
                <div>
                  <label htmlFor="phone" className="block font-semibold">Phone</label>
                  <input id="phone" name="phone" type="tel" defaultValue={c.phone ? formatPhone(c.phone) : ""} className={input} />
                </div>
                <div>
                  <label htmlFor="email" className="block font-semibold">Email</label>
                  <input id="email" name="email" type="email" defaultValue={c.email ?? ""} className={input} />
                </div>
                <div>
                  <label htmlFor="zip" className="block font-semibold">ZIP code</label>
                  <input id="zip" name="zip" inputMode="numeric" maxLength={5} defaultValue={c.zip ?? ""} className={input} />
                </div>
                <div>
                  <label htmlFor="county" className="block font-semibold">County</label>
                  <select id="county" name="county" defaultValue={c.county ?? ""} className={input}>
                    <option value="">—</option>
                    {countyOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </fieldset>
              {mayEdit ? <button type="submit" className="btn-primary sm:col-span-2 sm:justify-self-start">Save details</button> : null}
            </form>
          </section>

          {c.original_message ? (
            <section aria-labelledby="message">
              <h2 id="message" className="text-2xl font-bold">Original message</h2>
              <p className="mt-3 whitespace-pre-wrap break-words rounded-xl border border-line bg-surface p-5">{c.original_message}</p>
            </section>
          ) : null}
        </div>

        <div className="grid content-start gap-6">
          <section aria-labelledby="rating" className="rounded-xl border border-line bg-surface p-5">
            <h2 id="rating" className="text-xl font-bold">Lead rating</h2>
            <div className="mt-2"><LeadBadge category={category} /></div>
            <p className="mt-2"><span className="font-semibold">What to do:</span> {leadInfo[category].todo}</p>
            {mayEdit ? (
              <form action={setRating} className="mt-4 grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={c.id} />
                <div>
                  <label htmlFor="fit" className="block font-semibold">Fit</label>
                  <select id="fit" name="fit" defaultValue={c.fit ?? ""} className={input}>
                    <option value="">Not rated</option>
                    <option value="high">High</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="intent" className="block font-semibold">Intent</label>
                  <select id="intent" name="intent" defaultValue={c.intent ?? ""} className={input}>
                    <option value="">Not rated</option>
                    <option value="high">High</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <button type="submit" className="btn-primary sm:col-span-2">Save rating</button>
              </form>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">Fit: {c.fit ?? "not rated"} · Intent: {c.intent ?? "not rated"}</p>
            )}
            <details className="mt-4 text-sm text-ink-soft">
              <summary className="min-h-11 font-semibold text-ink">Rating guide</summary>
              <p className="mt-1"><strong>Fit high:</strong> lives/works in Metro Atlanta, valid license, needs a car for rideshare, delivery, courier or similar. <strong>Fit low:</strong> outside the area, no valid license, or wants something we don&apos;t offer.</p>
              <p className="mt-1"><strong>Intent high:</strong> needs a car soon, or asked about availability, pricing or next steps. <strong>Intent low:</strong> just researching, general question, no timeline.</p>
            </details>
          </section>

          <section aria-labelledby="renting" className="rounded-xl border border-line bg-surface p-5">
            <h2 id="renting" className="text-xl font-bold">Currently renting</h2>
            {renting.length ? (
              <ul className="mt-2 grid gap-1">
                {renting.map((v) => (
                  <li key={v.id}>{carName(v)} ({v.code}){v.rented_since ? ` since ${v.rented_since}` : ""}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-ink-soft">No car.</p>
            )}
          </section>

          <section aria-labelledby="apps" className="rounded-xl border border-line bg-surface p-5">
            <h2 id="apps" className="text-xl font-bold">Linked applications</h2>
            {c.applications?.length ? (
              <ul className="mt-2 grid gap-2">
                {c.applications.map((a) => (
                  <li key={a.id}>
                    <Link href={`/admin/applications/${a.id}/`} className="font-semibold">{a.reference}</Link>
                    <span className="block text-sm text-ink-soft">{formatAtlanta(a.submitted_at)}{a.vehicle_label ? ` · ${a.vehicle_label}` : ""}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-ink-soft">None.</p>
            )}
          </section>

          {dupes.length ? (
            <section aria-labelledby="dupes" className="rounded-xl border-2 border-caution bg-caution-soft p-5">
              <h2 id="dupes" className="text-xl font-bold text-caution">Possible duplicates</h2>
              <p className="text-sm">Same phone or email. Not merged automatically.</p>
              <ul className="mt-2 grid gap-1">
                {dupes.map((d) => (
                  <li key={d.id}>
                    <Link href={`/admin/contacts/${d.id}/`} className="font-semibold">{d.first_name} {d.last_name}</Link> <LeadBadge category={d.lead_category} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>

      <Notes parent="contact_id" parentId={c.id} canAdd={mayNote} canDelete={mayDelete} addAction={addContactNote} deleteAction={deleteContactNote} />
      <History recordType="contact" recordId={c.id} />
    </>
  );
}
