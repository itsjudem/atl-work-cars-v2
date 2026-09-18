import { PRICE_FALLBACK, UNKNOWN_FALLBACK } from "@/data/site";
import type { Unknown } from "@/data/types";

/** A known string, or the standard "Contact us / Apply…" fallback. */
export function orUnknown(value: Unknown<string>): string {
  return value ?? UNKNOWN_FALLBACK;
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** Whole dollars, or "Contact us for pricing". Never an invented number. */
export function formatPrice(value: Unknown<number>, suffix = ""): string {
  return value === null ? PRICE_FALLBACK : `${usd.format(value)}${suffix}`;
}

/** Odometer reading, or `null` so the caller hides the row. */
export function formatMileage(value: Unknown<number>): string | null {
  return value === null ? null : `${new Intl.NumberFormat("en-US").format(value)} miles`;
}

/** Combined MPG, or `null` so the caller hides the row. */
export function formatMpg(value: Unknown<number>): string | null {
  return value === null ? null : `${value} MPG combined`;
}

/** "7705550100" → "(770) 555-0100". Anything else is returned unchanged. */
export function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, "");
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : digits;
}
