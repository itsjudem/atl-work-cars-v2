import Link from "next/link";
import { site } from "@/data/site";

/** Wordmark with a simple road mark. Generic — no third-party brand imagery. */
export function Logo({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const text = tone === "dark" ? "text-ink" : "text-white";
  return (
    <Link
      href="/"
      className={`inline-flex min-h-11 items-center gap-2 no-underline ${text}`}
      aria-label={`${site.name} home`}
    >
      <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" className="shrink-0">
        <rect width="32" height="32" rx="7" className="fill-brand" />
        <path d="M11 26 14.5 6h3L21 26" fill="none" stroke="white" strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M16 9v3M16 15v3M16 21v3" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <span className="font-heading text-xl font-bold tracking-tight">{site.name}</span>
    </Link>
  );
}
