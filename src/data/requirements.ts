import type { Requirement } from "./types";

/**
 * Placeholder requirements. Do not add a specific age, credit score, deposit,
 * insurance requirement or driving-record standard until the owner supplies one.
 */
export const requirements: Requirement[] = [
  {
    title: "Valid driver's license",
    description: "You'll need a current, valid driver's license to rent and drive the vehicle.",
  },
  {
    title: "Meet minimum age requirement",
    description: "Renters must meet our minimum age requirement. We'll confirm the details when we review your application.",
  },
  {
    title: "Proof of identity",
    description: "We verify the identity of every renter before a vehicle is handed over.",
  },
  {
    title: "Approved application",
    description: "Every rental starts with an application that our team reviews and approves.",
  },
  {
    title: "Intended use of the vehicle",
    description: "Tell us how you plan to use the car — rideshare, delivery, courier work, or something else — so we can match you with the right vehicle.",
  },
  {
    title: "Additional documentation may be required",
    description: "Depending on your application, we may ask for other documents. We'll tell you exactly what's needed before pickup.",
  },
];

export const requirementsCopy = {
  heading: "Driver Requirements",
  intro: "The basics you'll need to rent a work car from ATL Work Cars.",
  disclaimer: "Submitting an application does not guarantee approval.",
} as const;
