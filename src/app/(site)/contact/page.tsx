import type { Metadata } from "next";
import { ContactDetails } from "@/components/ContactDetails";
import { ContactForm } from "@/components/form/ContactForm";
import { PageIntro } from "@/components/PageIntro";
import { contactCopy } from "@/data/copy";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Contact ATL Work Cars | Weekly Work Car Rentals in Metro Atlanta",
  description:
    "Call, text or email ATL Work Cars about weekly car rentals for rideshare and delivery drivers in Atlanta and Gwinnett County, or send us a message online.",
  path: "/contact/",
});

export default function ContactPage() {
  return (
    <>
      <PageIntro title={contactCopy.heading} lede={contactCopy.intro} />
      <section className="section">
        <div className="container-page grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold">Reach us directly</h2>
            <div className="mt-4">
              <ContactDetails />
            </div>
          </div>
          <ContactForm headingLevel="h2" />
        </div>
      </section>
    </>
  );
}
