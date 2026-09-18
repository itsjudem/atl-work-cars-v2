import type { PolicyItem } from "./types";

/**
 * Pricing and rental policies. Every value is currently unknown (`null`), which
 * renders "Contact us / Apply for current details". To publish a real value,
 * replace `null` with a string here — no component changes are needed.
 */
export const policies: PolicyItem[] = [
  { id: "weeklyRate", label: "Weekly rental rate", value: null },
  { id: "deposit", label: "Security deposit", value: null },
  { id: "mileage", label: "Mileage policy", value: null },
  { id: "insurance", label: "Insurance", value: null },
  { id: "maintenance", label: "Maintenance", value: null },
  { id: "roadside", label: "Roadside assistance", value: null },
  { id: "paymentFrequency", label: "Payment frequency", value: null },
  { id: "latePayment", label: "Late payment", value: null },
  { id: "duration", label: "Rental duration", value: null },
  { id: "pickup", label: "Pickup requirements", value: null },
  { id: "eligibility", label: "Eligibility", value: null },
];

/** Required wording. Never state or imply that insurance is included. */
export const insuranceStatement =
  "Insurance requirements and any coverage provided are defined in the rental agreement. Contact ATL Work Cars or submit an application for the details that apply to your rental.";

export const pricingCopy = {
  heading: "Pricing",
  intro:
    "Rentals are priced by the week. Current rates, deposits and terms are confirmed with you directly before you sign anything.",
  note: "Nothing is charged by submitting an application.",
} as const;

/** The subset shown in the homepage pricing section. */
export const homePricingIds = ["weeklyRate", "deposit", "mileage", "paymentFrequency"] as const;
