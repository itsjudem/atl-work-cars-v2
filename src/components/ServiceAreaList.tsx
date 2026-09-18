import { counties } from "@/data/service-areas";

/** Counties and cities. Gwinnett County and Atlanta get the strongest emphasis. */
export function ServiceAreaList({ headingLevel = "h3" }: { headingLevel?: "h2" | "h3" }) {
  const H = headingLevel;
  const primary = counties.filter((c) => c.primary);
  const secondary = counties.filter((c) => !c.primary);
  return (
    <div className="mt-8 grid gap-4 lg:grid-cols-2">
      {primary.map((c) => (
        <section key={c.id} className="rounded-xl border-2 border-brand bg-surface p-6" aria-labelledby={`county-${c.id}`}>
          <H id={`county-${c.id}`} className="text-2xl font-bold">
            {c.name}
            {c.id === "gwinnett" ? <span className="ml-2 align-middle text-sm font-semibold text-accent">Primary focus</span> : null}
          </H>
          <ul className="mt-3 flex flex-wrap gap-2">
            {c.cities.map((city) => (
              <li
                key={city.name}
                className={`rounded-full px-3 py-1.5 ${city.primary ? "bg-brand font-semibold text-white" : "bg-surface-muted"}`}
              >
                {city.name}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <div className="grid gap-4 sm:grid-cols-3 lg:col-span-2">
        {secondary.map((c) => (
          <section key={c.id} className="card" aria-labelledby={`county-${c.id}`}>
            <H id={`county-${c.id}`} className="text-xl font-bold">
              {c.name}
            </H>
            <p className="mt-2 text-ink-soft">{c.cities.map((city) => city.name).join(" · ")}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
