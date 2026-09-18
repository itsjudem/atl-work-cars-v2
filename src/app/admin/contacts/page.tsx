import type { Metadata } from "next";
import Link from "next/link";
import { Flash } from "@/components/admin/Flash";
import { LeadBadge } from "@/components/admin/LeadBadge";
import { Pager } from "@/components/admin/Pager";
import { formatPhone } from "@/lib/format";
import { duplicateIds } from "@/lib/admin/duplicates";
import { isLeadCategory, leadInfo, type LeadCategory } from "@/lib/admin/lead";
import { one, PAGE_SIZE, pageNumber, type SearchParams, searchTerm } from "@/lib/admin/nav";
import { can } from "@/lib/admin/roles";
import { requireStaff } from "@/lib/admin/session";
import { formatAtlanta } from "@/lib/admin/time";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: { absolute: "Contacts | ATL Work Cars Admin" } };

interface Row {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  lead_category: LeadCategory;
  contacted: boolean;
  source: string;
  created_at: string;
  renting: { code: string; year: number; make: string; model: string }[];
}

const sourceLabels: Record<string, string> = { contact_form: "Contact form", application: "Application", manual: "Added by staff" };
const categories = Object.keys(leadInfo) as LeadCategory[];
const control = "mt-1 block min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-ink";

export default async function ContactsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const me = await requireStaff("/admin/contacts/");
  const params = await searchParams;
  // Default view: "Needs attention" — active, not contacted, Hot → Unrated → Warm → Low-priority → Dead.
  const view = one(params, "view") === "all" ? "all" : "attention";
  const category = one(params, "category") ?? "";
  const contacted = one(params, "contacted") ?? "all";
  const source = one(params, "source") ?? "";
  const status = one(params, "status") === "archived" ? "archived" : "active";
  const q = searchTerm(one(params, "q"));
  const page = pageNumber(params);

  const supabase = await createClient();
  let rows: Row[] = [];
  let total = 0;
  let dupes = new Set<string>();
  if (supabase) {
    let query = supabase
      .from("contacts")
      .select("id, first_name, last_name, phone, email, lead_category, contacted, source, created_at, renting:vehicles(code, year, make, model)", { count: "exact" });
    if (view === "attention") {
      query = query.is("archived_at", null).eq("contacted", false);
    } else {
      query = status === "archived" ? query.not("archived_at", "is", null) : query.is("archived_at", null);
      if (contacted === "no") query = query.eq("contacted", false);
      if (contacted === "yes") query = query.eq("contacted", true);
    }
    if (isLeadCategory(category)) query = query.eq("lead_category", category);
    if (source in sourceLabels) query = query.eq("source", source);
    for (const word of q.split(" ").filter(Boolean)) {
      const digits = word.replace(/\D/g, "");
      const ors = [`first_name.ilike.*${word}*`, `last_name.ilike.*${word}*`, `email.ilike.*${word}*`];
      if (digits.length >= 3) ors.push(`phone.like.*${digits}*`);
      query = query.or(ors.join(","));
    }
    if (view === "attention") query = query.order("lead_rank", { ascending: true });
    const { data, count } = await query.order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    rows = (data ?? []) as unknown as Row[];
    total = count ?? 0;
    dupes = await duplicateIds(supabase, rows);
  }

  const kept = { view, category, contacted, source, status, q };
  const tab = (v: "attention" | "all", label: string) => (
    <Link href={v === "all" ? "/admin/contacts/?view=all" : "/admin/contacts/"} aria-current={view === v ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-lg px-4 font-semibold no-underline ${view === v ? "bg-navy text-white" : "bg-surface text-ink"}`}>
      {label}
    </Link>
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl font-bold">Contacts</h1>
        {can.editContacts(me.role) ? <Link href="/admin/contacts/new/" className="btn-primary">Add contact</Link> : null}
      </div>
      <Flash params={params} />
      <div className="mt-5 flex gap-2">{tab("attention", "Needs attention")}{tab("all", "All contacts")}</div>

      <form method="get" className="mt-4 grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] lg:items-end">
        <input type="hidden" name="view" value={view} />
        <div>
          <label htmlFor="q" className="text-sm font-semibold">Search</label>
          <input id="q" name="q" defaultValue={q} placeholder="Name, phone or email" className={control} />
        </div>
        <div>
          <label htmlFor="category" className="text-sm font-semibold">Lead</label>
          <select id="category" name="category" defaultValue={category} className={control}>
            <option value="">Any</option>
            {categories.map((c) => <option key={c} value={c}>{leadInfo[c].label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="source" className="text-sm font-semibold">Source</label>
          <select id="source" name="source" defaultValue={source} className={control}>
            <option value="">Any</option>
            {Object.entries(sourceLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {view === "all" ? (
          <>
            <div>
              <label htmlFor="contacted" className="text-sm font-semibold">Contacted</label>
              <select id="contacted" name="contacted" defaultValue={contacted} className={control}>
                <option value="all">All</option>
                <option value="no">Not contacted</option>
                <option value="yes">Contacted</option>
              </select>
            </div>
            <div>
              <label htmlFor="status" className="text-sm font-semibold">Show</label>
              <select id="status" name="status" defaultValue={status} className={control}>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </>
        ) : (
          <p className="text-sm text-ink-soft lg:col-span-2">Active contacts not yet contacted, Hot first.</p>
        )}
        <button type="submit" className="btn-primary min-h-11 py-2">Apply</button>
      </form>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-xl border border-line bg-surface p-6 text-ink-soft">No contacts match.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[60rem] text-left text-sm">
            <thead className="border-b border-line bg-surface-muted">
              <tr>
                {["Name", "Phone", "Email", "Lead", "Contacted", "Source", "Created", "Renting"].map((h) => (
                  <th key={h} scope="col" className="px-3 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className="align-top hover:bg-surface-muted">
                  <td className="px-3 py-3">
                    <Link href={`/admin/contacts/${r.id}/`} className="font-semibold">{r.first_name} {r.last_name}</Link>
                    {dupes.has(r.id) ? <span className="mt-1 block w-fit rounded bg-caution-soft px-2 py-0.5 text-xs font-semibold text-caution">Possible duplicate</span> : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">{r.phone ? formatPhone(r.phone) : "—"}</td>
                  <td className="px-3 py-3 break-all">{r.email ?? "—"}</td>
                  <td className="px-3 py-3"><LeadBadge category={r.lead_category} /></td>
                  <td className="px-3 py-3">{r.contacted ? "Yes" : <span className="font-semibold text-danger">No</span>}</td>
                  <td className="px-3 py-3">{sourceLabels[r.source] ?? r.source}</td>
                  <td className="whitespace-nowrap px-3 py-3">{formatAtlanta(r.created_at)}</td>
                  <td className="px-3 py-3">{r.renting?.length ? r.renting.map((v) => `${v.year} ${v.make} ${v.model}`).join(", ") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager basePath="/admin/contacts/" params={kept} page={page} total={total} pageSize={PAGE_SIZE} />
    </>
  );
}
