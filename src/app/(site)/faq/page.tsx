import type { Metadata } from "next";
import { ClosingCta } from "@/components/ClosingCta";
import { FaqList } from "@/components/FaqList";
import { JsonLd } from "@/components/JsonLd";
import { PageIntro } from "@/components/PageIntro";
import { faqs } from "@/data/faq";
import { pageMetadata } from "@/lib/seo";
import { faqPageSchema } from "@/lib/structured-data";

export const metadata: Metadata = pageMetadata({
  title: "FAQ: Weekly Rideshare & Delivery Car Rental in Atlanta | ATL Work Cars",
  description:
    "Answers about renting a work car in Metro Atlanta: who can rent, how weekly rentals work, rideshare and delivery use, deposits, insurance, pickup and documents.",
  path: "/faq/",
});

export default function FaqPage() {
  return (
    <>
      <PageIntro title="Frequently Asked Questions" lede="Everything drivers usually ask before applying." />
      <section className="section" aria-label="Questions and answers">
        <div className="container-page max-w-4xl">
          <FaqList items={faqs} headingLevel="h2" />
        </div>
      </section>
      <ClosingCta />
      <JsonLd data={faqPageSchema(faqs)} />
    </>
  );
}
