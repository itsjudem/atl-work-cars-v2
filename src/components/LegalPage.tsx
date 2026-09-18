import { PageIntro } from "@/components/PageIntro";
import type { LegalDocument } from "@/data/types";

export function LegalPage({ doc }: { doc: LegalDocument }) {
  const updated = new Date(`${doc.updated}T12:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  });
  return (
    <>
      <PageIntro title={doc.title} lede={doc.intro}>
        <p className="mt-4 text-sm text-ink-soft">Last updated {updated}</p>
      </PageIntro>
      <div className="container-page max-w-3xl pb-16 pt-4">
        <div className="prose-legal">
          {doc.sections.map((s) => (
            <section key={s.heading}>
              <h2>{s.heading}</h2>
              {s.paragraphs.map((p) => (
                <p key={p.slice(0, 40)}>{p}</p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
