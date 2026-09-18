import type { Metadata } from "next";
import Link from "next/link";
import { ClosingCta } from "@/components/ClosingCta";
import { HowItWorksSteps } from "@/components/HowItWorksSteps";
import { PageIntro } from "@/components/PageIntro";
import { howItWorks, whoWeServe } from "@/data/copy";
import { cta } from "@/data/navigation";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "How Weekly Work Car Rental Works | ATL Work Cars",
  description:
    "Apply online, get approved, choose an available vehicle and start working. How weekly car rental for rideshare and delivery drivers works at ATL Work Cars in Atlanta.",
  path: "/how-it-works/",
});

export default function HowItWorksPage() {
  return (
    <>
      <PageIntro title={howItWorks.heading} lede={howItWorks.intro}>
        <Link href={cta.primary.href} data-cta="how_apply" className="btn-primary mt-6">
          {cta.primary.label}
        </Link>
      </PageIntro>
      <section className="section" aria-label="Steps">
        <div className="container-page">
          <HowItWorksSteps headingLevel="h2" />
          <p className="mt-8 max-w-3xl text-sm text-ink-soft">{whoWeServe.disclosure}</p>
        </div>
      </section>
      <ClosingCta />
    </>
  );
}
