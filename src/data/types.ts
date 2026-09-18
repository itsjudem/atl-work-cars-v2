/**
 * Shared content types. Any business fact that is not yet known is `null`;
 * the UI renders a fallback for it instead of guessing. See src/lib/format.ts.
 */

/** A value that may not be known yet. */
export type Unknown<T> = T | null;

export type BodyType = "sedan" | "compact" | "hatchback" | "hybrid" | "suv" | "minivan";

export type Availability = "available" | "limited" | "reserved" | "rented" | "maintenance";

export interface Vehicle {
  /** Stable code used in URLs (/apply/?vehicle=awc-101). Never renumber. */
  id: string;
  year: number;
  make: string;
  model: string;
  trim: Unknown<string>;
  bodyType: BodyType;
  /** Whole US dollars per week. */
  weeklyRate: Unknown<number>;
  /** Whole US dollars. */
  deposit: Unknown<number>;
  mileagePolicy: Unknown<string>;
  /** Odometer reading in miles. */
  mileage: Unknown<number>;
  seats: number;
  /** Combined MPG (or MPGe). */
  fuelEconomy: Unknown<number>;
  /** Plain vehicle facts only (age, doors, seats). Never a platform promise. */
  rideshareEligibilityNote: Unknown<string>;
  availability: Availability;
  featured: boolean;
  pickupLocation: Unknown<string>;
  /** Path under /public. `null` renders an illustration, never a stock photo. */
  photo: Unknown<string>;
  photoAlt: Unknown<string>;
  /** Demo data. Drives the "Sample listing" badge and the inventory notice. */
  isPlaceholder: boolean;
}

export interface NavLink {
  label: string;
  href: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface County {
  id: string;
  name: string;
  /** Strongest emphasis in copy and layout. */
  primary: boolean;
  cities: City[];
}

export interface City {
  name: string;
  /** Strongest emphasis in copy and layout. */
  primary: boolean;
}

export interface PolicyItem {
  id: string;
  label: string;
  /** `null` renders "Contact us / Apply for current details". */
  value: Unknown<string>;
}

export interface Requirement {
  title: string;
  description: string;
}

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalDocument {
  title: string;
  description: string;
  /** ISO date the text was last revised. */
  updated: string;
  intro: string;
  sections: LegalSection[];
}
