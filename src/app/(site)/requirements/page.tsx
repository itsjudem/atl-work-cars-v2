import type { Metadata } from "next";
import Link from "next/link";
import { ClosingCta } from "@/components/ClosingCta";
import { PageIntro } from "@/components/PageIntro";
import { RequirementsList } from "@/components/RequirementsList";
import { requirementsCopy } from "@/data/requirements";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Driver Requirements for Weekly Car Rental | ATL Work Cars",
  description:
    "What you need to rent a work car from ATL Work Cars in Metro Atlanta: a valid driver's license, proof of identity, minimum age and an approved application.",
  path: "/requirements/",
});

export default function RequirementsPage() {
  return (
    <>
      <PageIntro title={requirementsCopy.heading} lede={requirementsCopy.intro} />
      <section className="section" aria-label="Requirements">
        <div className="container-page">
          <RequirementsList headingLevel="h2" />
          <p className="mt-4 text-ink-soft">
            Questions about whether you qualify? <Link href="/contact/">Contact us</Link> or see the{" "}
            <Link href="/faq/">FAQ</Link>.
          </p>
        </div>
      </section>
      <ClosingCta />
    </>
  );
}
