import { serviceAreaCopy } from "@/data/service-areas";
import { mailtoHref, site, smsHref, telHref } from "@/data/site";

/** Phone, text, email, hours and service area — all from src/data/site.ts. */
export function ContactDetails() {
  const rows = [
    { term: "Call", value: site.phoneDisplay, href: telHref, cta: "contact_call" },
    { term: "Text", value: site.phoneDisplay, href: smsHref, cta: "contact_text" },
    { term: "Email", value: site.email, href: mailtoHref, cta: "contact_email" },
  ];
  return (
    <dl className="grid gap-3">
      {rows.map((r) => (
        <div key={r.term} className="card flex items-center justify-between gap-4 p-4">
          <dt className="font-semibold">{r.term}</dt>
          <dd>
            <a href={r.href} data-cta={r.cta} className="inline-flex min-h-11 items-center font-semibold">
              {r.value}
            </a>
          </dd>
        </div>
      ))}
      <div className="card flex items-center justify-between gap-4 p-4">
        <dt className="font-semibold">Hours</dt>
        <dd className="text-ink-soft">{site.hours}</dd>
      </div>
      <div className="card p-4">
        <dt className="font-semibold">Service area</dt>
        <dd className="mt-1 text-ink-soft">{serviceAreaCopy.body}</dd>
      </div>
    </dl>
  );
}
