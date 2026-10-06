"use client";

import Link, { useLinkStatus } from "next/link";

/**
 * A link that shows a small spinner on itself while the next page is being
 * fetched. The page you're on stays on screen the whole time — nothing is
 * replaced by a "Loading…" screen — but the click never looks ignored.
 */
function Spinner() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      aria-hidden
      className="ml-2 inline-block size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent align-[-2px]"
    />
  );
}

export function PendingLink({ children, ...props }: React.ComponentProps<typeof Link>) {
  return (
    <Link {...props}>
      {children}
      <Spinner />
    </Link>
  );
}
