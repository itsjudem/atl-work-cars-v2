import { counties } from "@/data/service-areas";
import { absoluteUrl, site } from "@/data/site";
import type { FaqItem } from "@/data/types";

/**
 * Schema.org data — only what is genuinely true. No ratings, prices, founding
 * date or street address. The phone is omitted while it is a placeholder.
 */
export function localBusinessSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${absoluteUrl("/")}#business`,
    name: site.name,
    url: absoluteUrl("/"),
    email: site.email,
    ...(site.phoneIsPlaceholder ? {} : { telephone: site.phoneE164 }),
    description: "Weekly car rentals for rideshare, delivery and gig drivers in Metro Atlanta.",
    areaServed: counties.map((c) => ({
      "@type": "AdministrativeArea",
      name: `${c.name}, Georgia`,
    })),
  };
}

export function faqPageSchema(items: FaqItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}
