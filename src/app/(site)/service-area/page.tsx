import type { Metadata } from "next";
import Link from "next/link";
import { ClosingCta } from "@/components/ClosingCta";
import { PageIntro } from "@/components/PageIntro";
import { ServiceAreaList } from "@/components/ServiceAreaList";
import { publishedLocations } from "@/data/locations";
import { serviceAreaCopy } from "@/data/service-areas";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Service Area: Gwinnett County, Atlanta & Metro Atlanta | ATL Work Cars",
  description:
    "ATL Work Cars rents weekly work cars in Gwinnett, Fulton, DeKalb, Cobb and Clayton counties — Lawrenceville, Atlanta, Duluth, Decatur, Marietta and more.",
  path: "/service-area/",
});

export default function ServiceAreaPage() {
  const local = publishedLocations();
  return (
    <>
      <PageIntro title={serviceAreaCopy.headline} lede={serviceAreaCopy.body} />
      <section className="section" aria-label="Counties and cities">
        <div className="container-page">
          <ServiceAreaList headingLevel="h2" />
          <p className="mt-8 max-w-3xl text-ink-soft">{serviceAreaCopy.limits}</p>
          {local.length ? (
            <div className="mt-10">
              <h2 className="text-2xl font-bold">Local pages</h2>
              <ul className="mt-3 flex flex-wrap gap-3">
                {local.map((l) => (
                  <li key={l.slug}>
                    <Link href={`/${l.slug}/`} className="btn-secondary">
                      Work car rentals in {l.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
      <ClosingCta />
    </>
  );
}
