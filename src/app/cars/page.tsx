import type { Metadata } from "next";
import { ClosingCta } from "@/components/ClosingCta";
import { PageIntro } from "@/components/PageIntro";
import { SampleInventoryNotice, VehicleCard } from "@/components/VehicleCard";
import { hasPlaceholderInventory, vehicles, vehiclesCopy } from "@/data/vehicles";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Available Work Cars for Weekly Rental in Atlanta | ATL Work Cars",
  description:
    "Browse weekly rental cars for rideshare, delivery and courier work in Metro Atlanta — sedans, hybrids, SUVs and minivans. Apply for the car that fits your work.",
  path: "/cars/",
});

export default function CarsPage() {
  return (
    <>
      <PageIntro title={vehiclesCopy.heading} lede={vehiclesCopy.intro} />
      <section className="section" aria-label="Vehicle listings">
        <div className="container-page">
          <SampleInventoryNotice show={hasPlaceholderInventory(vehicles)} />
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((v) => (
              <VehicleCard key={v.id} vehicle={v} headingLevel="h2" />
            ))}
          </div>
        </div>
      </section>
      <ClosingCta />
    </>
  );
}
