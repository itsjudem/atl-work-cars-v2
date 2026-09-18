import { isLeadCategory, leadInfo } from "@/lib/admin/lead";

/** Colour AND name, never colour alone. */
export function LeadBadge({ category }: { category: string | null | undefined }) {
  if (!isLeadCategory(category)) return <span className="text-ink-soft">—</span>;
  const info = leadInfo[category];
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-semibold ${info.badge}`}>{info.label}</span>;
}
