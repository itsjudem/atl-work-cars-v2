import Image from "next/image";
import Link from "next/link";
import { cta } from "@/data/navigation";
import type { Vehicle } from "@/data/types";
import { availabilityPresentation, bodyTypeLabels, vehicleLabel, vehiclesCopy } from "@/data/vehicles";
import { formatMileage, formatMpg, formatPrice, orUnknown } from "@/lib/format";
import { VehicleArt } from "./VehicleArt";

const toneClass = {
  go: "bg-accent-soft text-accent",
  caution: "bg-caution-soft text-caution",
  muted: "bg-surface-muted text-ink-soft",
} as const;

export function StatusBadge({ vehicle }: { vehicle: Vehicle }) {
  // A sample listing shows ONLY the sample badge — never an availability badge.
  if (vehicle.isPlaceholder) {
    return (
      <span className="inline-flex rounded-full border border-caution/40 bg-caution-soft px-3 py-1 text-sm font-semibold text-caution">
        {vehiclesCopy.sampleBadge}
      </span>
    );
  }
  const a = availabilityPresentation[vehicle.availability];
  return <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${toneClass[a.tone]}`}>{a.label}</span>;
}

export function VehicleCard({ vehicle, headingLevel = "h3" }: { vehicle: Vehicle; headingLevel?: "h2" | "h3" }) {
  const H = headingLevel;
  const label = vehicleLabel(vehicle);

  // Sample listings never show odometer or fuel economy; unknown values hide their row.
  const rows: { term: string; value: string | null }[] = [
    { term: "Weekly rate", value: formatPrice(vehicle.weeklyRate, " / week") },
    { term: "Deposit", value: formatPrice(vehicle.deposit) },
    { term: "Type", value: `${bodyTypeLabels[vehicle.bodyType]} · seats ${vehicle.seats}` },
    { term: "Mileage policy", value: orUnknown(vehicle.mileagePolicy) },
    { term: "Odometer", value: vehicle.isPlaceholder ? null : formatMileage(vehicle.mileage) },
    { term: "Fuel economy", value: vehicle.isPlaceholder ? null : formatMpg(vehicle.fuelEconomy) },
    { term: "Pickup", value: vehicle.pickupLocation ?? vehiclesCopy.pickupFallback },
  ];

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface">
      {vehicle.photo ? (
        <Image
          src={vehicle.photo}
          alt={vehicle.photoAlt ?? label}
          width={800}
          height={450}
          sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
          className="aspect-[16/9] w-full object-cover"
        />
      ) : (
        <VehicleArt bodyType={vehicle.bodyType} label={label} />
      )}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge vehicle={vehicle} />
        </div>
        <H className="mt-3 text-2xl font-bold">{label}</H>
        <dl className="mt-3 space-y-1.5 text-[0.95rem]">
          {rows
            .filter((r): r is { term: string; value: string } => r.value !== null)
            .map((r) => (
              <div key={r.term} className="flex justify-between gap-4 border-b border-line/70 pb-1.5">
                <dt className="text-ink-soft">{r.term}</dt>
                <dd className="text-right font-medium">{r.value}</dd>
              </div>
            ))}
        </dl>
        {vehicle.rideshareEligibilityNote ? (
          <p className="mt-3 text-sm text-ink-soft">{vehicle.rideshareEligibilityNote}</p>
        ) : null}
        <div className="mt-auto pt-5">
          <Link
            href={`/apply/?vehicle=${encodeURIComponent(vehicle.id)}`}
            data-cta="vehicle_apply"
            className="btn-primary w-full"
            aria-label={`${cta.vehicle}: ${label}`}
          >
            {cta.vehicle}
          </Link>
        </div>
      </div>
    </article>
  );
}

/** Shown whenever the listed inventory contains demo data. Derived, never hardcoded. */
export function SampleInventoryNotice({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p role="note" className="rounded-lg border border-caution/30 bg-caution-soft p-4 text-caution">
      {vehiclesCopy.sampleNotice}
    </p>
  );
}
