import type { Metadata } from "next";
import Link from "next/link";
import { ClosingCta } from "@/components/ClosingCta";
import { PageIntro } from "@/components/PageIntro";
import { PolicyList } from "@/components/PolicyList";
import { rentalPoliciesDoc } from "@/data/legal";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Rental Policies: Rates, Deposit & Insurance | ATL Work Cars",
  description: rentalPoliciesDoc.description,
  path: "/rental-policies/",
});

export default function RentalPoliciesPage() {
  return (
    <>
      <PageIntro title={rentalPoliciesDoc.title} lede={rentalPoliciesDoc.intro} />
      <section className="section">
        <div className="container-page max-w-4xl">
          <h2 className="sr-only">Policy details</h2>
          <PolicyList />
          <p className="mt-6 text-ink-soft">
            Have a question about a policy? <Link href="/contact/">Contact us</Link>.
          </p>
        </div>
      </section>
      <ClosingCta />
    </>
  );
}
