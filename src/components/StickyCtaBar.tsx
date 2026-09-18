"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cta } from "@/data/navigation";
import { smsHref, telHref } from "@/data/site";

/**
 * Mobile-only bar fixed to the bottom: Apply / Call / Text. A spacer of the
 * same height is rendered in the page flow so the bar never covers content or
 * the footer. Hidden (with its spacer) on the application page.
 */
export function StickyCtaBar() {
  const pathname = usePathname();
  if (pathname.startsWith("/apply")) return null;

  return (
    <>
      <div aria-hidden="true" className="h-sticky-bar md:hidden" />
      <div className="fixed inset-x-0 bottom-0 z-40 h-sticky-bar border-t border-line bg-surface/95 px-3 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="flex h-full items-center gap-2">
          <Link href={cta.primary.href} data-cta="sticky_apply" className="btn-primary min-h-12 flex-1 px-3">
            {cta.primary.label}
          </Link>
          <a href={telHref} data-cta="sticky_call" className="btn-secondary min-h-12 px-4">
            Call
          </a>
          <a href={smsHref} data-cta="sticky_text" className="btn-secondary min-h-12 px-4">
            Text
          </a>
        </div>
      </div>
    </>
  );
}
