import { requirements, requirementsCopy } from "@/data/requirements";

export function RequirementsList({ headingLevel = "h3" }: { headingLevel?: "h2" | "h3" }) {
  const H = headingLevel;
  return (
    <>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {requirements.map((r) => (
          <li key={r.title} className="flex gap-3 rounded-xl border border-line bg-surface p-5">
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" className="mt-0.5 shrink-0 text-accent">
              <circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.12" />
              <path d="m7 12.5 3.2 3.2L17 9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <H className="text-lg font-bold">{r.title}</H>
              <p className="mt-1 text-ink-soft">{r.description}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-6 font-medium">{requirementsCopy.disclaimer}</p>
    </>
  );
}
