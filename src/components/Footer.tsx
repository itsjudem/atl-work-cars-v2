import Link from "next/link";
import { footerCopy } from "@/data/copy";
import { footerNav, legalNav } from "@/data/navigation";
import { counties } from "@/data/service-areas";
import { mailtoHref, site, smsHref, telHref } from "@/data/site";
import { Logo } from "./Logo";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-navy text-navy-soft">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo tone="light" />
          <p className="mt-3 text-sm">{footerCopy.tagline}</p>
        </div>

        <nav aria-label="Footer">
          <h2 className="text-lg font-semibold text-white">Explore</h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 sm:grid-cols-1">
            {footerNav.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="inline-flex min-h-11 items-center text-navy-soft no-underline hover:text-white hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-lg font-semibold text-white">Contact</h2>
          <ul className="mt-3 space-y-1">
            <li>
              <a href={telHref} className="inline-flex min-h-11 items-center text-navy-link">Call {site.phoneDisplay}</a>
            </li>
            <li>
              <a href={smsHref} className="inline-flex min-h-11 items-center text-navy-link">Text {site.phoneDisplay}</a>
            </li>
            <li>
              <a href={mailtoHref} className="inline-flex min-h-11 items-center text-navy-link">{site.email}</a>
            </li>
            <li className="pt-1 text-sm">{site.hours}</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white">Service area</h2>
          <p className="mt-3 text-sm">Metro Atlanta, Georgia:</p>
          <ul className="mt-1 text-sm leading-7">
            {counties.map((c) => (
              <li key={c.id} className={c.primary ? "font-semibold text-white" : undefined}>
                {c.name}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/15">
        <div className="container-page py-6 text-sm">
          <p>{footerCopy.disclaimer}</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <ul className="flex flex-wrap gap-x-5">
              {legalNav.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-flex min-h-11 items-center text-navy-soft hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p>
              © {year} {site.name}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
