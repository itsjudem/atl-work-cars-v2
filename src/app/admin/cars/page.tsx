import type { Metadata } from "next";
import Link from "next/link";
import { Flash } from "@/components/admin/Flash";
import { carName, carStatusLabels as statusLabels, carStatusStyle as statusStyle, type CarStatus } from "@/lib/admin/car-status";
import { one, type SearchParams } from "@/lib/admin/nav";
import { can } from "@/lib/admin/roles";
import { requireStaff } from "@/lib/admin/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: { absolute: "Cars | ATL Work Cars Admin" } };

interface Row {
  id: string;
  code: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  status: CarStatus;
  weekly_rate: number | null;
  is_published: boolean;
  is_sample: boolean;
  renter: { id: string; first_name: string; last_name: string } | null;
}

const control = "mt-1 block min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-ink";

export default async function CarsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const me = await requireStaff("/admin/cars/");
  const params = await searchParams;
  const status = one(params, "status") ?? "";
  const website = one(params, "website") ?? "";

  const supabase = await createClient();
  let rows: Row[] = [];
  if (supabase) {
    let query = supabase
      .from("vehicles")
      .select("id, code, year, make, model, trim, status, weekly_rate, is_published, is_sample, renter:contacts(id, first_name, last_name)");
    if (status in statusLabels) query = query.eq("status", status);
    if (website === "shown") query = query.eq("is_published", true);
    if (website === "hidden") query = query.eq("is_published", false);
    const { data } = await query.order("code", { ascending: true });
    rows = (data ?? []) as unknown as Row[];
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl font-bold">Cars</h1>
        {can.editCars(me.role) ? <Link href="/admin/cars/new/" className="btn-primary">Add car</Link> : null}
      </div>
      <Flash params={params} />

      <form method="get" className="mt-5 grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="status" className="text-sm font-semibold">Status</label>
          <select id="status" name="status" defaultValue={status} className={control}>
            <option value="">Any</option>
            {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="website" className="text-sm font-semibold">On website</label>
          <select id="website" name="website" defaultValue={website} className={control}>
            <option value="">Any</option>
            <option value="shown">Shown</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>
        <button type="submit" className="btn-primary min-h-11 py-2">Apply</button>
      </form>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-xl border border-line bg-surface p-6 text-ink-soft">No cars match.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[50rem] text-left text-sm">
            <thead className="border-b border-line bg-surface-muted">
              <tr>
                {["Code", "Car", "Status", "Renter", "Weekly rate", "On website"].map((h) => (
                  <th key={h} scope="col" className="px-3 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className="align-top hover:bg-surface-muted">
                  <td className="whitespace-nowrap px-3 py-3 font-mono">{r.code}</td>
                  <td className="px-3 py-3">
                    <Link href={`/admin/cars/${r.id}/`} className="font-semibold">{carName(r)}</Link>
                    {r.is_sample ? <span className="mt-1 block w-fit rounded bg-surface-muted px-2 py-0.5 text-xs font-semibold text-ink-soft">Sample</span> : null}
                  </td>
                  <td className="px-3 py-3"><span className={`rounded px-2 py-0.5 text-xs font-semibold ${statusStyle[r.status]}`}>{statusLabels[r.status]}</span></td>
                  <td className="px-3 py-3">{r.renter ? <Link href={`/admin/contacts/${r.renter.id}/`}>{r.renter.first_name} {r.renter.last_name}</Link> : "—"}</td>
                  <td className="whitespace-nowrap px-3 py-3">{r.weekly_rate === null ? "—" : `$${r.weekly_rate.toLocaleString("en-US")}`}</td>
                  <td className="px-3 py-3">{r.is_published ? "Shown" : <span className="font-semibold text-ink-soft">Hidden</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
