import Link from "next/link";
import { cta, headerNav } from "@/data/navigation";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded focus:bg-surface focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <div className="container-page relative flex h-header items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {headerNav.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="inline-flex min-h-11 items-center rounded-md px-3 text-[0.95rem] font-medium text-ink no-underline hover:bg-surface-muted"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <Link href={cta.primary.href} data-cta="header_apply" className="btn-primary hidden min-h-11 py-2 lg:inline-flex">
          {cta.primary.label}
        </Link>
        <MobileMenu links={headerNav} cta={cta.primary} />
      </div>
    </header>
  );
}
