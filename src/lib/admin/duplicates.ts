import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface DuplicateMatch {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  lead_category: string;
}

/**
 * Contacts that share a phone or an email with the given values. Used to flag
 * "Possible duplicate" — contacts are never merged automatically.
 */
export async function findDuplicates(
  supabase: SupabaseClient,
  phone: string | null,
  email: string | null,
  excludeId?: string,
): Promise<DuplicateMatch[]> {
  const ors: string[] = [];
  if (phone && /^\d{10}$/.test(phone)) ors.push(`phone.eq.${phone}`);
  if (email && !/[,()]/.test(email)) ors.push(`email.eq.${email}`);
  if (!ors.length) return [];
  let q = supabase.from("contacts").select("id, first_name, last_name, phone, email, lead_category").or(ors.join(","));
  if (excludeId) q = q.neq("id", excludeId);
  const { data } = await q.limit(10);
  return (data ?? []) as DuplicateMatch[];
}

/** For a page of contacts, which ids share a phone or email with another contact. */
export async function duplicateIds(
  supabase: SupabaseClient,
  rows: { id: string; phone: string | null; email: string | null }[],
): Promise<Set<string>> {
  const phones = [...new Set(rows.map((r) => r.phone).filter((p): p is string => !!p && /^\d{10}$/.test(p)))];
  const emails = [...new Set(rows.map((r) => r.email).filter((e): e is string => !!e && !/[,()"]/.test(e)))];
  if (!phones.length && !emails.length) return new Set();
  const ors = [
    ...(phones.length ? [`phone.in.(${phones.join(",")})`] : []),
    ...(emails.length ? [`email.in.(${emails.map((e) => `"${e}"`).join(",")})`] : []),
  ];
  const { data } = await supabase.from("contacts").select("id, phone, email").or(ors.join(",")).limit(1000);
  const all = (data ?? []) as { id: string; phone: string | null; email: string | null }[];
  const dup = new Set<string>();
  for (const r of rows) {
    if (all.some((o) => o.id !== r.id && ((r.phone && o.phone === r.phone) || (r.email && o.email === r.email)))) dup.add(r.id);
  }
  return dup;
}
