import type { Metadata } from "next";
import Link from "next/link";
import { CarFields } from "@/components/admin/CarFields";
import { Flash } from "@/components/admin/Flash";
import { type SearchParams } from "@/lib/admin/nav";
import { can } from "@/lib/admin/roles";
import { requireStaff } from "@/lib/admin/session";
import { createCar } from "../actions";

export const metadata: Metadata = { title: { absolute: "Add car | ATL Work Cars Admin" } };

const input = "mt-1.5 block min-h-12 w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-ink";

export default async function NewCarPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const me = await requireStaff("/admin/cars/new/");
  const params = await searchParams;
  return (
    <>
      <p><Link href="/admin/cars/" className="inline-flex min-h-11 items-center font-semibold">← All cars</Link></p>
      <h1 className="text-4xl font-bold">Add car</h1>
      <Flash params={params} />
      {can.editCars(me.role) ? (
        <form action={createCar} className="mt-6 grid max-w-3xl gap-4 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="code" className="block font-semibold">Car code</label>
            <p id="code-hint" className="text-sm text-ink-soft">Used in website links, e.g. awc-201. Lowercase letters, numbers and dashes. It can&apos;t be changed later.</p>
            <input id="code" name="code" required maxLength={40} pattern="[a-z0-9\-]{1,40}" aria-describedby="code-hint" className={`${input} sm:max-w-xs`} />
          </div>
          <CarFields />
          <button type="submit" className="btn-primary sm:col-span-2 sm:justify-self-start">Add car</button>
        </form>
      ) : (
        <p className="mt-6 rounded-xl border border-line bg-surface p-6 text-ink-soft">Only an Owner or Fleet Manager can add cars.</p>
      )}
    </>
  );
}
