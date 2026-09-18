import "server-only";

/**
 * Application reference: AWC-YYYYMMDD-XXXXX, generated on the SERVER only.
 * The alphabet leaves out look-alikes (0/O, 1/I) because staff read it over
 * the phone. Phase 2's database DEFAULT and CHECK must use this same alphabet.
 */
export const REFERENCE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const REFERENCE_PATTERN = /^AWC-\d{8}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}$/;

/** YYYYMMDD in Atlanta time, so the date matches the applicant's day. */
function atlantaDateStamp(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}${get("month")}${get("day")}`;
}

export function generateReference(now: Date = new Date()): string {
  // 32 symbols → a byte's low 5 bits map uniformly, no modulo bias.
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  const suffix = Array.from(bytes, (b) => REFERENCE_ALPHABET[b & 31]).join("");
  return `AWC-${atlantaDateStamp(now)}-${suffix}`;
}
