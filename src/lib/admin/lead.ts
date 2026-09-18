/** Lead categories — computed by the database from fit × intent. */
export type LeadCategory = "hot" | "warm" | "low_priority" | "dead" | "unrated";
export type Rating = "high" | "low";

export const leadInfo: Record<LeadCategory, { label: string; todo: string; badge: string; rank: number }> = {
  hot: {
    label: "Hot lead",
    todo: "Fast sales pitch/demo immediately.",
    badge: "bg-danger text-white",
    rank: 1,
  },
  unrated: {
    label: "Unrated",
    todo: "Nobody has rated this lead yet. Set fit and intent.",
    badge: "border border-line bg-surface text-ink-soft",
    rank: 2,
  },
  warm: {
    label: "Warm lead",
    todo: "Long-term nurturing with helpful content.",
    badge: "bg-caution-soft text-caution",
    rank: 3,
  },
  low_priority: {
    label: "Low-priority lead",
    todo: "May waste time; needs something you don't truly offer.",
    badge: "bg-surface-muted text-brand",
    rank: 4,
  },
  dead: {
    label: "Dead lead",
    todo: "Archive or drop.",
    badge: "bg-ink-soft text-white",
    rank: 5,
  },
};

export function isLeadCategory(v: unknown): v is LeadCategory {
  return typeof v === "string" && v in leadInfo;
}
