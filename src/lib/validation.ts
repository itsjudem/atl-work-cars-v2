/** Small shared validators used by both public forms (browser AND server). */

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

/** Strip formatting; accept a leading US country code. Returns digits only. */
export function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  return d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
}

/** Exactly 10 digits, with a valid US area code and exchange (no leading 0/1). */
export function isValidPhone(raw: string): boolean {
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(normalizePhone(raw));
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(raw: string): boolean {
  const e = normalizeEmail(raw);
  return e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

export function isValidZip(raw: string): boolean {
  return /^\d{5}$/.test(raw.trim());
}

export function isValidName(raw: string): boolean {
  const n = raw.trim();
  return n.length >= 1 && n.length <= 50 && /^[\p{L}][\p{L}\p{M}' .-]*$/u.test(n);
}

/** Read one string field from an untrusted object, trimmed and length-capped. */
export function readString(source: Record<string, unknown>, key: string, max: number): string {
  const v = source[key];
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export function asRecord(body: unknown): Record<string, unknown> {
  return body !== null && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
}

export function hasErrors<K extends string>(errors: FieldErrors<K>): boolean {
  return Object.keys(errors).length > 0;
}
