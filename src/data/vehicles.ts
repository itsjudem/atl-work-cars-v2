import type { Availability, BodyType, Vehicle } from "./types";

/**
 * FALLBACK ONLY. Since Phase 2, cars live in the database (`vehicles` table) and
 * the site reads them through src/lib/vehicles/public.ts. This list is used only
 * when Supabase isn't configured (e.g. a deploy without the env vars), and it
 * matches the database seed (supabase/migrations/…001100_seed_sample_vehicles.sql).
 *
 * DEMO INVENTORY. No real vehicles exist yet. Every entry is marked
 * `isPlaceholder: true`, which shows the "Sample listing" badge and the
 * inventory notice automatically. Replace these with real cars (and set
 * `isPlaceholder: false`) and both disappear on their own.
 *
 * Keep the codes awc-101 … awc-106: shared links and Phase 2 depend on them.
 * Prices, odometer and fuel economy are left `null` on purpose — never invent them.
 */
export const vehicles: Vehicle[] = [
  {
    id: "awc-101",
    year: 2020,
    make: "Toyota",
    model: "Camry",
    trim: "LE",
    bodyType: "sedan",
    weeklyRate: null,
    deposit: null,
    mileagePolicy: null,
    mileage: null,
    seats: 5,
    fuelEconomy: null,
    rideshareEligibilityNote: "4 doors, seats 5, model year 2020.",
    availability: "available",
    featured: true,
    pickupLocation: null,
    photo: null,
    photoAlt: null,
    isPlaceholder: true,
  },
  {
    id: "awc-102",
    year: 2021,
    make: "Toyota",
    model: "Prius",
    trim: null,
    bodyType: "hybrid",
    weeklyRate: null,
    deposit: null,
    mileagePolicy: null,
    mileage: null,
    seats: 5,
    fuelEconomy: null,
    rideshareEligibilityNote: "4 doors, seats 5, model year 2021.",
    availability: "available",
    featured: true,
    pickupLocation: null,
    photo: null,
    photoAlt: null,
    isPlaceholder: true,
  },
  {
    id: "awc-103",
    year: 2019,
    make: "Nissan",
    model: "Sentra",
    trim: "S",
    bodyType: "compact",
    weeklyRate: null,
    deposit: null,
    mileagePolicy: null,
    mileage: null,
    seats: 5,
    fuelEconomy: null,
    rideshareEligibilityNote: "4 doors, seats 5, model year 2019.",
    availability: "available",
    featured: true,
    pickupLocation: null,
    photo: null,
    photoAlt: null,
    isPlaceholder: true,
  },
  {
    id: "awc-104",
    year: 2019,
    make: "Honda",
    model: "Fit",
    trim: null,
    bodyType: "hatchback",
    weeklyRate: null,
    deposit: null,
    mileagePolicy: null,
    mileage: null,
    seats: 5,
    fuelEconomy: null,
    rideshareEligibilityNote: "4 doors, seats 5, model year 2019.",
    availability: "available",
    featured: false,
    pickupLocation: null,
    photo: null,
    photoAlt: null,
    isPlaceholder: true,
  },
  {
    id: "awc-105",
    year: 2020,
    make: "Toyota",
    model: "RAV4",
    trim: "LE",
    bodyType: "suv",
    weeklyRate: null,
    deposit: null,
    mileagePolicy: null,
    mileage: null,
    seats: 5,
    fuelEconomy: null,
    rideshareEligibilityNote: "4 doors, seats 5, model year 2020.",
    availability: "available",
    featured: false,
    pickupLocation: null,
    photo: null,
    photoAlt: null,
    isPlaceholder: true,
  },
  {
    id: "awc-106",
    year: 2018,
    make: "Dodge",
    model: "Grand Caravan",
    trim: "SE",
    bodyType: "minivan",
    weeklyRate: null,
    deposit: null,
    mileagePolicy: null,
    mileage: null,
    seats: 7,
    fuelEconomy: null,
    rideshareEligibilityNote: "4 doors plus sliding rear doors, seats 7, model year 2018.",
    availability: "in_repair",
    featured: false,
    pickupLocation: null,
    photo: null,
    photoAlt: null,
    isPlaceholder: true,
  },
];

export const bodyTypeLabels: Record<BodyType, string> = {
  sedan: "Sedan",
  compact: "Compact sedan",
  hatchback: "Hatchback",
  hybrid: "Hybrid",
  suv: "SUV",
  minivan: "Minivan",
};

export const availabilityPresentation: Record<
  Availability,
  { label: string; tone: "go" | "caution" | "muted" }
> = {
  available: { label: "Available now", tone: "go" },
  rented: { label: "Currently rented", tone: "muted" },
  in_repair: { label: "Temporarily unavailable", tone: "muted" },
};

export const vehiclesCopy = {
  heading: "Available Cars",
  intro: "Reliable weekly rentals for rideshare, delivery and courier work across Metro Atlanta.",
  homeHeading: "Available Vehicles",
  sampleBadge: "Sample listing",
  sampleNotice:
    "Live inventory is being added. The cars shown are sample listings to illustrate the kinds of vehicles we rent. Apply and we'll contact you about the cars actually available.",
  sampleApplyMessage: "This is a sample listing. We will contact you about the cars actually available.",
  pickupFallback: "Confirmed after approval",
  emptyNotice: "No cars are listed right now. Apply and we'll contact you as soon as one is available.",
} as const;

/* ---------- derived helpers (no hardcoded sample behaviour) ---------- */

export function getVehicle(id: string): Vehicle | undefined {
  return vehicles.find((v) => v.id === id);
}

export function vehicleLabel(v: Pick<Vehicle, "year" | "make" | "model" | "trim">): string {
  return [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");
}

/** True when any listed vehicle is demo data — drives the inventory notice. */
export function hasPlaceholderInventory(list: Vehicle[] = vehicles): boolean {
  return list.some((v) => v.isPlaceholder);
}

/** Three vehicles for the homepage: featured first, then the rest. */
export function homepageVehicles(): Vehicle[] {
  return [...vehicles.filter((v) => v.featured), ...vehicles.filter((v) => !v.featured)].slice(0, 3);
}
