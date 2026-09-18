import "server-only";
import { cache } from "react";
import type { Availability, BodyType, Vehicle } from "@/data/types";
import { vehicles as fallbackVehicles } from "@/data/vehicles";
import { createAdminClient } from "@/lib/supabase/admin";
import { photoUrl } from "./photo";

/**
 * Cars for the PUBLIC website. Read with the secret key from the
 * `public_vehicles` view — published cars, public columns only. The renter,
 * notes, history and anything internal never leave the database.
 *
 * When Supabase isn't configured at all, the old file list is used so the site
 * still renders. If the database is configured but unreachable, the list is
 * empty rather than showing stale sample cars.
 */

interface PublicVehicleRow {
  code: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  body_type: BodyType;
  weekly_rate: number | null;
  deposit: number | null;
  mileage_policy: string | null;
  odometer: number | null;
  seats: number;
  fuel_economy: number | string | null;
  rideshare_note: string | null;
  pickup_location: string | null;
  photo_path: string | null;
  photo_alt: string | null;
  status: Availability;
  is_featured: boolean;
  is_sample: boolean;
}

function toVehicle(r: PublicVehicleRow): Vehicle {
  return {
    id: r.code,
    year: r.year,
    make: r.make,
    model: r.model,
    trim: r.trim,
    bodyType: r.body_type,
    weeklyRate: r.weekly_rate,
    deposit: r.deposit,
    mileagePolicy: r.mileage_policy,
    mileage: r.odometer,
    seats: r.seats,
    fuelEconomy: r.fuel_economy === null ? null : Number(r.fuel_economy),
    rideshareEligibilityNote: r.rideshare_note,
    availability: r.status,
    featured: r.is_featured,
    pickupLocation: r.pickup_location,
    photo: photoUrl(r.photo_path),
    photoAlt: r.photo_alt,
    isPlaceholder: r.is_sample,
  };
}

const statusOrder: Record<Availability, number> = { available: 0, in_repair: 1, rented: 2 };

/** All published cars: available first, then featured, then newest model year. Cached per request. */
export const getPublicVehicles = cache(async (): Promise<Vehicle[]> => {
  const db = createAdminClient();
  if (!db) return fallbackVehicles;
  const { data, error } = await db.from("public_vehicles").select("*");
  if (error) {
    console.error("[vehicles] public read failed", error.code);
    return [];
  }
  return ((data ?? []) as PublicVehicleRow[])
    .map(toVehicle)
    .sort(
      (a, b) =>
        statusOrder[a.availability] - statusOrder[b.availability] ||
        Number(b.featured) - Number(a.featured) ||
        b.year - a.year ||
        a.id.localeCompare(b.id),
    );
});

export async function getPublicVehicle(code: string): Promise<Vehicle | undefined> {
  if (!/^[a-z0-9-]{1,40}$/.test(code)) return undefined;
  return (await getPublicVehicles()).find((v) => v.id === code);
}

/** Three for the homepage: featured first, then the rest (already sorted). */
export async function getHomepageVehicles(): Promise<Vehicle[]> {
  const all = await getPublicVehicles();
  return [...all.filter((v) => v.featured), ...all.filter((v) => !v.featured)].slice(0, 3);
}
