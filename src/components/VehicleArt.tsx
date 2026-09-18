import type { BodyType } from "@/data/types";

/**
 * Styled illustration used when a vehicle has no photo. It is clearly a
 * drawing, never a stock photo of a car the company doesn't own.
 */
const silhouettes: Record<BodyType, string> = {
  sedan: "M18 62h164v-8c0-6-4-10-10-11l-30-5-22-16c-4-3-8-4-13-4H78c-6 0-11 2-15 6L48 38l-20 4c-6 1-10 6-10 12z",
  compact: "M22 62h156v-8c0-6-4-10-10-11l-28-5-22-15c-4-3-8-4-13-4H82c-6 0-10 2-14 6L54 38l-22 5c-6 1-10 5-10 11z",
  hatchback: "M24 62h152v-9c0-6-3-10-9-11l-26-5-20-17c-4-3-8-4-12-4H70c-6 0-10 3-12 8l-10 20-14 3c-6 1-10 6-10 12z",
  hybrid: "M18 62h164v-8c0-6-4-10-10-11l-34-6-26-17c-4-2-8-3-12-3H84c-7 0-12 3-16 7L50 38l-22 4c-6 1-10 6-10 12z",
  suv: "M18 62h164V48c0-6-4-10-10-11l-24-3-14-16c-3-4-8-6-13-6H62c-6 0-10 3-12 8l-8 16-14 2c-6 1-10 6-10 12z",
  minivan: "M16 62h168V46c0-6-4-10-10-11l-18-2-18-19c-3-3-7-4-11-4H48c-6 0-10 3-12 8l-8 18-2 1c-6 1-10 6-10 12z",
};

export function VehicleArt({ bodyType, label }: { bodyType: BodyType; label: string }) {
  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-muted" role="img" aria-label={`Illustration of a ${label}. Photo coming soon.`}>
      <svg viewBox="0 0 200 90" className="absolute inset-0 size-full p-6" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
        <path d="M0 78h200" className="stroke-line" strokeWidth="2" strokeDasharray="10 8" />
        <path d={silhouettes[bodyType]} className="fill-navy/80" />
        <circle cx="55" cy="64" r="12" className="fill-navy stroke-surface-muted" strokeWidth="4" />
        <circle cx="145" cy="64" r="12" className="fill-navy stroke-surface-muted" strokeWidth="4" />
      </svg>
      <span className="absolute bottom-2 right-3 text-xs font-medium text-ink-soft">Photo coming soon</span>
    </div>
  );
}
