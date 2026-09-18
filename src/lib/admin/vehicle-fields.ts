/** Car details as staff edit them. The database re-checks every rule. */
import type { BodyType } from "@/data/types";
import { bodyTypeLabels } from "@/data/vehicles";

export interface VehicleFields {
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
  fuel_economy: number | null;
  rideshare_note: string | null;
  pickup_location: string | null;
  is_featured: boolean;
  is_published: boolean;
  is_sample: boolean;
}

function text(form: FormData, name: string, max: number): string {
  const v = form.get(name);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** "" → null; otherwise a whole number in range, or NaN. */
function whole(v: string, min: number, max: number): number | null {
  if (v === "") return null;
  const n = Number(v.replace(/[$,\s]/g, ""));
  return Number.isInteger(n) && n >= min && n <= max ? n : Number.NaN;
}

export const CODE_PATTERN = /^[a-z0-9-]{1,40}$/;

export function readVehicleFields(form: FormData): { values: VehicleFields; error: string | null } {
  const year = whole(text(form, "year", 4), 1990, 2100);
  const seats = whole(text(form, "seats", 2), 1, 15);
  const weekly = whole(text(form, "weekly_rate", 10), 0, 100000);
  const deposit = whole(text(form, "deposit", 10), 0, 100000);
  const odometer = whole(text(form, "odometer", 10), 0, 2000000);
  const fuelRaw = text(form, "fuel_economy", 8);
  const fuel = fuelRaw === "" ? null : Number(fuelRaw);
  const body = text(form, "body_type", 20);

  const values: VehicleFields = {
    year: year ?? Number.NaN,
    make: text(form, "make", 40),
    model: text(form, "model", 40),
    trim: text(form, "trim", 40) || null,
    body_type: body as BodyType,
    weekly_rate: weekly,
    deposit,
    mileage_policy: text(form, "mileage_policy", 200) || null,
    odometer,
    seats: seats ?? Number.NaN,
    fuel_economy: fuel,
    rideshare_note: text(form, "rideshare_note", 300) || null,
    pickup_location: text(form, "pickup_location", 120) || null,
    is_featured: form.get("is_featured") === "on",
    is_published: form.get("is_published") === "on",
    is_sample: form.get("is_sample") === "on",
  };

  let error: string | null = null;
  if (!Number.isInteger(values.year)) error = "Enter a model year between 1990 and 2100.";
  else if (!values.make || !values.model) error = "Enter the make and model.";
  else if (!(body in bodyTypeLabels)) error = "Choose a body type.";
  else if (!Number.isInteger(values.seats)) error = "Enter the number of seats (1–15).";
  else if (Number.isNaN(weekly)) error = "Weekly rate must be whole dollars, or leave it blank.";
  else if (Number.isNaN(deposit)) error = "Deposit must be whole dollars, or leave it blank.";
  else if (Number.isNaN(odometer)) error = "Odometer must be a whole number of miles, or leave it blank.";
  else if (fuel !== null && !(fuel > 0 && fuel < 1000)) error = "Fuel economy must be a number like 32, or leave it blank.";
  return { values, error };
}
