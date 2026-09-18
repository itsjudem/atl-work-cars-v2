import type { Metadata } from "next";
import Link from "next/link";
import { roleLabels } from "@/lib/admin/roles";
import { requireStaff } from "@/lib/admin/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: { absolute: "Dashboard | ATL Work Cars Admin" } };

interface Tile {
  label: string;
  count: number | null;
  href?: string;
}

/** Admin home: the counts that tell staff what needs doing. */
export default async function AdminHome() {
  const staff = await requireStaff("/admin/");
  const supabase = await createClient();

  async function count(table: "applications" | "contacts" | "vehicles", filter: (q: CountQuery) => CountQuery): Promise<number | null> {
    if (!supabase) return null;
    const { count: n, error } = await filter(supabase.from(table).select("id", { count: "exact", head: true }) as unknown as CountQuery);
    return error ? null : (n ?? 0);
  }

  const [appsNew, contactsNew, hotNew, unrated, available, rented, repair] = await Promise.all([
    count("applications", (q) => q.is("archived_at", null).eq("contacted", false)),
    count("contacts", (q) => q.is("archived_at", null).eq("contacted", false)),
    count("contacts", (q) => q.is("archived_at", null).eq("contacted", false).eq("lead_category", "hot")),
    count("contacts", (q) => q.is("archived_at", null).eq("lead_category", "unrated")),
    count("vehicles", (q) => q.eq("status", "available")),
    count("vehicles", (q) => q.eq("status", "rented")),
    count("vehicles", (q) => q.eq("status", "in_repair")),
  ]);

  const groups: { heading: string; tiles: Tile[] }[] = [
    {
      heading: "Needs attention",
      tiles: [
        { label: "Applications not yet contacted", count: appsNew, href: "/admin/applications/?contacted=no" },
        { label: "Contacts not yet contacted", count: contactsNew, href: "/admin/contacts/" },
        { label: "Hot leads not yet contacted", count: hotNew, href: "/admin/contacts/?category=hot" },
        { label: "Unrated contacts", count: unrated, href: "/admin/contacts/?view=all&category=unrated" },
      ],
    },
    {
      heading: "Cars",
      tiles: [
        { label: "Available", count: available },
        { label: "Rented", count: rented },
        { label: "In repair", count: repair },
      ],
    },
  ];

  return (
    <>
      <h1 className="text-4xl font-bold">Dashboard</h1>
      <p className="mt-2 text-ink-soft">
        Signed in as {staff.fullName} ({roleLabels[staff.role]}).
      </p>
      {groups.map((g) => (
        <section key={g.heading} className="mt-8" aria-labelledby={`h-${g.heading}`}>
          <h2 id={`h-${g.heading}`} className="text-2xl font-bold">
            {g.heading}
          </h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {g.tiles.map((t) => (
              <div key={t.label} className="relative rounded-xl border border-line bg-surface p-4 hover:border-brand">
                <dt className="text-sm text-ink-soft">
                  {t.href ? (
                    <Link href={t.href} className="text-ink-soft no-underline after:absolute after:inset-0">{t.label}</Link>
                  ) : (
                    t.label
                  )}
                </dt>
                <dd className="mt-1 font-heading text-4xl font-bold">{t.count ?? "—"}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </>
  );
}

// Minimal shape of the Supabase filter builder used above.
interface CountQuery extends PromiseLike<{ count: number | null; error: unknown }> {
  is(column: string, value: null): CountQuery;
  eq(column: string, value: string | boolean): CountQuery;
}
