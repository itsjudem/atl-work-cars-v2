import { countyOptions, pickupAreaOptions } from "./service-areas";
import { bodyTypeLabels } from "./vehicles";

/** Dropdown and radio options for the public forms. */
export const primaryUseOptions = [
  "Rideshare",
  "Food Delivery",
  "Grocery Delivery",
  "Courier",
  "Package Delivery",
  "Multiple Apps",
  "Other",
] as const;

export const platformStatusOptions = [
  "Yes, currently active",
  "Yes, but not active right now",
  "No, not signed up yet",
] as const;

export const urgencyOptions = ["Today", "Within 3 days", "Within 1 week", "Just researching"] as const;

export const yesNoOptions = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;

export const vehicleTypeOptions: string[] = ["No preference", ...Object.values(bodyTypeLabels)];

/** US states + DC, for "State issuing license". */
export const usStates: string[] = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
  "District of Columbia", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
  "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah",
  "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
];

export { countyOptions, pickupAreaOptions };
