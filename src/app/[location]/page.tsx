import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClosingCta } from "@/components/ClosingCta";
import { FaqList } from "@/components/FaqList";
import { JsonLd } from "@/components/JsonLd";
import { PageIntro } from "@/components/PageIntro";
import { whoWeServe } from "@/data/copy";
import { getPublishedLocation, publishedLocations } from "@/data/locations";
import { cta } from "@/data/navigation";
import { pageMetadata } from "@/lib/seo";
import { faqPageSchema } from "@/lib/structured-data";

// Only published local pages are built. Every other slug — including the
// unpublished cities — returns 404.
export const dynamicParams = false;

export function generateStaticParams(): { location: string }[] {
  return publishedLocations().map((l) => ({ location: l.slug }));
}

type Props = { params: Promise<{ location: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { location } = await params;
  const page = getPublishedLocation(location);
  if (!page) return {};
  return pageMetadata({ title: page.content.title, description: page.content.description, path: `/${page.slug}/` });
}

export default async function LocationPage({ params }: Props) {
  const { location } = await params;
  const page = getPublishedLocation(location);
  if (!page) notFound();
  const c = page.content;

  return (
    <>
      <PageIntro title={c.h1} lede={c.intro[0]}>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href={cta.primary.href} data-cta={`local_${page.slug}_apply`} className="btn-primary">
            {cta.primary.label}
          </Link>
          <Link href={cta.secondary.href} data-cta={`local_${page.slug}_cars`} className="btn-secondary">
            {cta.secondary.label}
          </Link>
        </div>
      </PageIntro>

      <section className="section">
        <div className="container-page grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          <div>
            {c.intro.slice(1).map((p) => (
              <p key={p.slice(0, 40)} className="text-lg text-ink-soft">
                {p}
              </p>
            ))}
            <h2 className="mt-10 text-3xl font-bold">{c.localSection.heading}</h2>
            {c.localSection.paragraphs.map((p) => (
              <p key={p.slice(0, 40)} className="mt-4 text-ink-soft">
                {p}
              </p>
            ))}
            <p className="mt-6 text-sm text-ink-soft">{whoWeServe.disclosure}</p>
          </div>
          <aside className="card h-fit" aria-labelledby="nearby">
            <h2 id="nearby" className="text-xl font-bold">
              Also serving nearby
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {c.nearby.map((n) => (
                <li key={n} className="rounded-full bg-surface-muted px-3 py-1.5">
                  {n}
                </li>
              ))}
            </ul>
            <Link href="/service-area/" className="mt-4 inline-flex min-h-11 items-center font-semibold">
              Full service area
            </Link>
          </aside>
        </div>
      </section>

      <section className="section bg-surface" aria-labelledby="local-faq">
        <div className="container-page max-w-4xl">
          <h2 id="local-faq" className="section-heading">
            {page.name} questions
          </h2>
          <FaqList items={c.faqs} />
        </div>
      </section>

      <ClosingCta />
      <JsonLd data={faqPageSchema(c.faqs)} />
    </>
  );
}
