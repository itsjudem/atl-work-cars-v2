import type { FaqItem } from "@/data/types";

/** Native details/summary accordion: no JavaScript, keyboard accessible. */
export function FaqList({ items, headingLevel = "h3" }: { items: FaqItem[]; headingLevel?: "h2" | "h3" }) {
  const H = headingLevel;
  return (
    <div className="mt-8 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
      {items.map((f) => (
        <details key={f.question} className="group">
          <summary className="flex min-h-14 items-center justify-between gap-4 px-5 py-4 hover:bg-surface-muted">
            <H className="font-sans text-lg font-semibold leading-snug">{f.question}</H>
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              aria-hidden="true"
              className="shrink-0 text-brand transition-transform group-open:rotate-45"
            >
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </summary>
          <p className="px-5 pb-5 text-ink-soft">{f.answer}</p>
        </details>
      ))}
    </div>
  );
}
