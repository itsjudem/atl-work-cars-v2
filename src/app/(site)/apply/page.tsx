import type { Metadata } from "next";
import { ApplicationForm, type SelectedVehicle } from "@/components/form/ApplicationForm";
import { PageIntro } from "@/components/PageIntro";
import { applyCopy } from "@/data/copy";
import { bodyTypeLabels, vehicleLabel, vehiclesCopy } from "@/data/vehicles";
import { getPublicVehicle } from "@/lib/vehicles/public";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Apply for a Weekly Work Car in Atlanta | ATL Work Cars",
  description:
    "Apply online for a weekly rental car for rideshare, delivery or courier work in Metro Atlanta. Four short steps on your phone — no payment details needed.",
  path: "/apply/",
});

export default async function ApplyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const requested = typeof params.vehicle === "string" ? params.vehicle : null;
  const found = requested ? await getPublicVehicle(requested) : undefined;
  const vehicle: SelectedVehicle | null = found
    ? { id: found.id, label: vehicleLabel(found), isSample: found.isPlaceholder, bodyTypeLabel: bodyTypeLabels[found.bodyType] }
    : null;

  return (
    <>
      <PageIntro title={applyCopy.heading} lede={applyCopy.intro} />
      <section className="py-8 sm:py-12">
        <div className="container-page max-w-3xl">
          {vehicle ? (
            <div className="mb-6 rounded-xl border border-line bg-surface p-5">
              <p className="text-sm font-semibold text-ink-soft">You&apos;re applying for</p>
              <p className="mt-1 font-heading text-2xl font-bold">{vehicle.label}</p>
              {vehicle.isSample ? (
                <p role="note" className="mt-3 rounded-lg bg-caution-soft p-3 font-medium text-caution">
                  {vehiclesCopy.sampleApplyMessage}
                </p>
              ) : null}
            </div>
          ) : null}
          {/* key: a different ?vehicle= remounts the form with fresh prefill. */}
          <ApplicationForm key={vehicle?.id ?? "general"} vehicle={vehicle} />
        </div>
      </section>
    </>
  );
}
