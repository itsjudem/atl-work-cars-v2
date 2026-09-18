import type { Metadata } from "next";
import Link from "next/link";
import { ClosingCta } from "@/components/ClosingCta";
import { ContactDetails } from "@/components/ContactDetails";
import { FaqList } from "@/components/FaqList";
import { ContactForm } from "@/components/form/ContactForm";
import { HowItWorksSteps } from "@/components/HowItWorksSteps";
import { PolicyList } from "@/components/PolicyList";
import { RequirementsList } from "@/components/RequirementsList";
import { ServiceAreaList } from "@/components/ServiceAreaList";
import { SampleInventoryNotice, VehicleCard } from "@/components/VehicleCard";
import { contactCopy, heroCopy, howItWorks, whoWeServe, whyUs } from "@/data/copy";
import { faqs, homeFaqCount } from "@/data/faq";
import { cta } from "@/data/navigation";
import { homePricingIds, pricingCopy } from "@/data/policies";
import { requirementsCopy } from "@/data/requirements";
import { serviceAreaCopy } from "@/data/service-areas";
import { hasPlaceholderInventory, homepageVehicles, vehiclesCopy } from "@/data/vehicles";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Weekly Car Rentals for Rideshare & Delivery Drivers | ATL Work Cars",
  description:
    "Need a reliable car to work? ATL Work Cars provides weekly vehicle rentals for rideshare, delivery, and gig drivers across Atlanta, Gwinnett County, and Metro Atlanta.",
  path: "/",
});

function SectionHead({ id, title, lede }: { id: string; title: string; lede?: string }) {
  return (
    <>
      <h2 id={id} className="section-heading">
        {title}
      </h2>
      {lede ? <p className="lede">{lede}</p> : null}
    </>
  );
}

export default function HomePage() {
  const preview = homepageVehicles();
  return (
    <>
      {/* 1. HERO — text-first on a solid navy band. No image above the headline. */}
      <section className="bg-navy" aria-labelledby="hero-heading">
        <div className="container-page py-12 sm:py-20 lg:py-24">
          <h1 id="hero-heading" className="max-w-3xl text-[2.6rem] leading-[1.05] font-bold text-white sm:text-6xl lg:text-7xl">
            {heroCopy.headline}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-navy-soft sm:text-xl">{heroCopy.subheadline}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={cta.primary.href} data-cta="hero_apply" className="btn-primary">
              {cta.primary.label}
            </Link>
            <Link href={cta.heroSecondary.href} data-cta="hero_how_it_works" className="btn-on-dark">
              {cta.heroSecondary.label}
            </Link>
          </div>
          <p className="mt-8 flex items-start gap-2 text-navy-soft">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" className="mt-0.5 shrink-0 text-navy-link">
              <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" fill="currentColor" />
            </svg>
            {serviceAreaCopy.trustLine}
          </p>
        </div>
      </section>

      {/* 2. WHO WE SERVE */}
      <section className="section" aria-labelledby="who-we-serve">
        <div className="container-page">
          <SectionHead id="who-we-serve" title={whoWeServe.heading} lede={whoWeServe.intro} />
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {whoWeServe.groups.map((g) => (
              <li key={g.title} className="border-l-4 border-brand bg-surface p-4">
                <h3 className="text-lg font-bold">{g.title}</h3>
                <p className="mt-1 text-[0.95rem] text-ink-soft">{g.description}</p>
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-3xl text-sm text-ink-soft">{whoWeServe.disclosure}</p>
        </div>
      </section>

      {/* 3. HOW IT WORKS */}
      <section className="section bg-surface" aria-labelledby="how-it-works">
        <div className="container-page">
          <SectionHead id="how-it-works" title={howItWorks.heading} lede={howItWorks.intro} />
          <HowItWorksSteps />
        </div>
      </section>

      {/* 4. WHY ATL WORK CARS */}
      <section className="section" aria-labelledby="why-us">
        <div className="container-page">
          <SectionHead id="why-us" title={whyUs.heading} />
          <dl className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {whyUs.features.map((f) => (
              <div key={f.title} className="border-t-2 border-ink pt-4">
                <dt className="font-heading text-xl font-bold">{f.title}</dt>
                <dd className="mt-1 text-ink-soft">{f.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* 5. AVAILABLE VEHICLES */}
      <section className="section bg-surface" aria-labelledby="vehicles">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHead id="vehicles" title={vehiclesCopy.homeHeading} />
            <Link href={cta.secondary.href} data-cta="home_view_cars" className="btn-secondary">
              {cta.secondary.label}
            </Link>
          </div>
          <div className="mt-6">
            <SampleInventoryNotice show={hasPlaceholderInventory(preview)} />
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {preview.map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
        </div>
      </section>

      {/* 6. PRICING */}
      <section className="section" aria-labelledby="pricing">
        <div className="container-page grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <SectionHead id="pricing" title={pricingCopy.heading} lede={pricingCopy.intro} />
            <p className="mt-3 font-medium">{pricingCopy.note}</p>
            <Link href="/rental-policies/" className="mt-4 inline-flex min-h-11 items-center font-semibold">
              See all rental policies
            </Link>
          </div>
          <PolicyList ids={homePricingIds} />
        </div>
      </section>

      {/* 7. DRIVER REQUIREMENTS */}
      <section className="section bg-surface" aria-labelledby="requirements">
        <div className="container-page">
          <SectionHead id="requirements" title={requirementsCopy.heading} lede={requirementsCopy.intro} />
          <RequirementsList />
        </div>
      </section>

      {/* 8. SERVICE AREA */}
      <section className="section" aria-labelledby="service-area">
        <div className="container-page">
          <SectionHead id="service-area" title={serviceAreaCopy.headline} lede={serviceAreaCopy.body} />
          <ServiceAreaList />
        </div>
      </section>

      {/* 9. FAQ */}
      <section className="section bg-surface" aria-labelledby="faq">
        <div className="container-page max-w-4xl">
          <SectionHead id="faq" title="Frequently Asked Questions" />
          <FaqList items={faqs.slice(0, homeFaqCount)} />
          <Link href="/faq/" className="mt-6 inline-flex min-h-11 items-center font-semibold">
            See all questions
          </Link>
        </div>
      </section>

      {/* 10. CONTACT */}
      <section className="section" aria-labelledby="contact">
        <div className="container-page grid gap-8 lg:grid-cols-2">
          <div>
            <SectionHead id="contact" title={contactCopy.homeHeading} lede={contactCopy.intro} />
            <div className="mt-6">
              <ContactDetails />
            </div>
          </div>
          <ContactForm />
        </div>
      </section>

      {/* 11. CLOSING CALL TO ACTION */}
      <ClosingCta />
      {/* 12. FOOTER — rendered by the root layout on every page. */}
    </>
  );
}
