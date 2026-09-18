import type { Metadata } from "next";
import Link from "next/link";
import { lookupStaff } from "@/lib/admin/session";
import { can, roleLabels, type StaffRole } from "@/lib/admin/roles";
import { site } from "@/data/site";
import { signOut } from "./actions";

// Admin pages are never indexed, never cached, and always built fresh for the
// logged-in person. (robots.txt also disallows /admin; none are in the sitemap.)
export const metadata: Metadata = {
  title: { absolute: `Admin | ${site.name}` },
  robots: { index: false, follow: false, nocache: true },
};
export const dynamic = "force-dynamic";

/** Links a person sees. Pages still check permissions themselves. */
function navFor(role: StaffRole) {
  return [
    { label: "Dashboard", href: "/admin/" },
    { label: "Applications", href: "/admin/applications/" },
    { label: "Contacts", href: "/admin/contacts/" },
    { label: "Cars", href: "/admin/cars/" },
    ...(can.manageStaff(role) ? [{ label: "Staff", href: "/admin/staff/" }] : [])];
}

/** The admin's own simple layout: no public header, footer or sticky bar. */
export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const who = await lookupStaff();
  const staff = who.status === "ok" ? who.staff : null;

  return (
    <div className="flex min-h-dvh flex-col bg-surface-muted">
      <header className="border-b border-line bg-navy text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/admin/" className="font-heading text-xl font-bold text-white no-underline">
            {site.name} <span className="font-sans text-sm font-medium text-navy-soft">Admin</span>
          </Link>
          {staff ? (
            <div className="flex items-center gap-3 text-sm">
              <span className="hidden text-navy-soft sm:inline">
                {staff.fullName} · {roleLabels[staff.role]}
              </span>
              <form action={signOut}>
                <button type="submit" className="btn-on-dark min-h-11 px-4 py-2 text-sm">
                  Log out
                </button>
              </form>
            </div>
          ) : null}
        </div>
        {staff ? (
          <nav aria-label="Admin" className="mx-auto w-full max-w-6xl overflow-x-auto px-4 sm:px-6">
            <ul className="flex gap-1 pb-2 text-sm">
              {navFor(staff.role).map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-flex min-h-11 items-center whitespace-nowrap rounded-md px-3 text-white no-underline hover:bg-white/10">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
