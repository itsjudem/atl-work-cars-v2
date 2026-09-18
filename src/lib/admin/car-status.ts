/** Car statuses as staff see them. Colour AND name, never colour alone. */
export type CarStatus = "available" | "rented" | "in_repair";

export const carStatusLabels: Record<CarStatus, string> = { available: "Available", rented: "Rented", in_repair: "In repair" };

export const carStatusStyle: Record<CarStatus, string> = {
  available: "bg-accent-soft text-accent",
  rented: "bg-navy text-white",
  in_repair: "bg-caution-soft text-caution",
};

export const carName = (v: { year: number; make: string; model: string; trim: string | null }) =>
  [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");
