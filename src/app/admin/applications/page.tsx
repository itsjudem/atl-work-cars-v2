import type { Metadata } from "next";
import Link from "next/link";
import { Flash } from "@/components/admin/Flash";
import { LeadBadge } from "@/components/admin/LeadBadge";
import { Pager } from "@/components/admin/Pager";
import { countyOptions, urgencyOptions } from "@/data/form-options";
import { formatPhone } from "@/lib/format";
import { one, PAGE_SIZE, pageNumber, type SearchParams, searchTerm } from "@/lib/admin/nav";
import { requireStaff } from "@/lib/admin/session";
import { formatAtlanta } from "@/lib/admin/time";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: { absolute: "Applications | ATL Work Cars Admin" } };

interface Row {
  id: string;
  reference: string;
  submitted_at: string;
  first_name: string;
  last_name: string;
  phone: string;
  county: string;
  primary_use: string;
  urgency: string;
  vehicle_label: string | null;
  contacted: boolean;
  archived_at: string | null;
  contact: { id: string; first_name: string; last_name: string; lead_category: string } | null;
}

const control = "mt-1 block min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-ink";

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireStaff("/admin/applications/");
  const params = await searchParams;
  const contacted = one(params, "contacted") ?? "all";
  const status = one(params, "status") === "archived" ? "archived" : "active";
  const urgency = one(params, "urgency") ?? "";
  const county = one(params, "county") ?? "";
  const q = searchTerm(one(params, "q"));
  const page = pageNumber(params);

  const supabase = await createClient();
  let rows: Row[] = [];
  let total = 0;
  if (supabase) {
    let query = supabase
      .from("applications")
      .select(
        "id, reference, submitted_at, first_name, last_name, phone, county, primary_use, urgency, vehicle_label, contacted, archived_at, contact:contacts(id, first_name, last_name, lead_category)",
        { count: "exact" },
      );
    query = status === "archived" ? query.not("archived_at", "is", null) : query.is("archived_at", null);
    if (contacted === "no") query = query.eq("contacted", false);
    if (contacted === "yes") query = query.eq("contacted", true);
    if ((urgencyOptions as readonly string[]).includes(urgency)) query = query.eq("urgency", urgency);
    if (countyOptions.includes(county)) query = query.eq("county", county);
    // Every word must match the name, email, reference or phone.
    for (const word of q.split(" ").filter(Boolean)) {
      const digits = word.replace(/\D/g, "");
      const ors = [`first_name.ilike.*${word}*`, `last_name.ilike.*${word}*`, `email.ilike.*${word}*`, `reference.ilike.*${word}*`];
      if (digits.length >= 3) ors.push(`phone.like.*${digits}*`);
      query = query.or(ors.join(","));
    }
    const { data, count } = await query
      .order("submitted_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    rows = (data ?? []) as unknown as Row[];
    total = count ?? 0;
  }

  const kept = { contacted, status, urgency, county, q };

  return (
    <>
      <h1 className="text-4xl font-bold">Applications</h1>
      <Flash params={params} />

      <form method="get" className="mt-6 grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] lg:items-end">
        <div>
          <label htmlFor="q" className="text-sm font-semibold">Search</label>
          <input id="q" name="q" defaultValue={q} placeholder="Name, phone, email or reference" className={control} />
        </div>
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
        <div>
          <label htmlFor="urgency" className="text-sm font-semibold">How soon</label>
          <select id="urgency" name="urgency" defaultValue={urgency} className={control}>
            <option value="">Any</option>
            {urgencyOptions.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="county" className="text-sm font-semibold">County</label>
          <select id="county" name="county" defaultValue={county} className={control}>
            <option value="">Any</option>
            {countyOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button type="submit" className="btn-primary min-h-11 py-2">Apply</button>
      </form>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-xl border border-line bg-surface p-6 text-ink-soft">No applications match.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[64rem] text-left text-sm">
            <thead className="border-b border-line bg-surface-muted">
              <tr>
                {["Submitted", "Name", "Phone", "County", "Primary use", "How soon", "Car applied for", "Linked contact", "Lead", "Contacted"].map((h) => (
                  <th key={h} scope="col" className="px-3 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className="align-top hover:bg-surface-muted">
                  <td className="whitespace-nowrap px-3 py-3">{formatAtlanta(r.submitted_at)}</td>
                  <td className="px-3 py-3">
                    <Link href={`/admin/applications/${r.id}/`} className="font-semibold">{r.first_name} {r.last_name}</Link>
                    <div className="text-xs text-ink-soft">{r.reference}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">{formatPhone(r.phone)}</td>
                  <td className="px-3 py-3">{r.county}</td>
                  <td className="px-3 py-3">{r.primary_use}</td>
                  <td className="px-3 py-3">{r.urgency}</td>
                  <td className="px-3 py-3">{r.vehicle_label ?? "—"}</td>
                  <td className="px-3 py-3">{r.contact ? `${r.contact.first_name} ${r.contact.last_name}` : "—"}</td>
                  <td className="px-3 py-3"><LeadBadge category={r.contact?.lead_category} /></td>
                  <td className="px-3 py-3">{r.contacted ? "Yes" : <span className="font-semibold text-danger">No</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager basePath="/admin/applications/" params={kept} page={page} total={total} pageSize={PAGE_SIZE} />
    </>
  );
}
