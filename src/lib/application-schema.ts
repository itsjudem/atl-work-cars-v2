/**
 * THE application rules — imported by the browser form AND the API route, so
 * client and server validation can never drift apart.
 *
 * This form never collects SSNs, license numbers, dates of birth, payment
 * details or documents. Do not add fields for them.
 */
import {
  countyOptions,
  pickupAreaOptions,
  platformStatusOptions,
  primaryUseOptions,
  urgencyOptions,
  usStates,
  vehicleTypeOptions,
} from "@/data/form-options";
import {
  asRecord,
  type FieldErrors,
  isValidEmail,
  isValidName,
  isValidPhone,
  isValidZip,
  normalizeEmail,
  normalizePhone,
  readString,
} from "./validation";

export interface ApplicationValues {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  zip: string;
  county: string;
  primaryUse: string;
  platforms: string;
  platformStatus: string;
  urgency: string;
  /** A plain number as typed. Never a date of birth. */
  age: string;
  hasLicense: string;
  licenseState: string;
  hasVehicle: string;
  preferredVehicleType: string;
  pickupArea: string;
  notes: string;
  consent: boolean;
  /** Optional car code from /apply/?vehicle=… */
  vehicleId: string;
}

export type ApplicationField = keyof ApplicationValues;

export const HONEYPOT_FIELD = "website";

export const emptyApplication: ApplicationValues = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  zip: "",
  county: "",
  primaryUse: "",
  platforms: "",
  platformStatus: "",
  urgency: "",
  age: "",
  hasLicense: "",
  licenseState: "",
  hasVehicle: "",
  preferredVehicleType: "",
  pickupArea: "",
  notes: "",
  consent: false,
  vehicleId: "",
};

export const applicationSteps = [
  { id: 1, title: "Contact", fields: ["firstName", "lastName", "phone", "email", "zip", "county"] },
  { id: 2, title: "Work", fields: ["primaryUse", "platforms", "platformStatus", "urgency"] },
  { id: 3, title: "Driver information", fields: ["age", "hasLicense", "licenseState", "hasVehicle", "preferredVehicleType"] },
  { id: 4, title: "Final", fields: ["pickupArea", "notes", "consent"] },
] as const satisfies readonly { id: number; title: string; fields: readonly ApplicationField[] }[];

export type StepId = (typeof applicationSteps)[number]["id"];

export const MAX = { name: 50, email: 254, platforms: 200, notes: 1000, short: 80 } as const;

/** Age bounds are an INPUT SANITY CHECK, not an eligibility rule. Do not tighten to 18/21/25. */
export const AGE_MIN = 16;
export const AGE_MAX = 100;

const oneOf = (list: readonly string[], v: string) => list.includes(v);

/** Validate a single field against the full set of values (for conditional rules). */
export function validateApplicationField(field: ApplicationField, v: ApplicationValues): string | undefined {
  switch (field) {
    case "firstName":
      return isValidName(v.firstName) ? undefined : "Enter your first name.";
    case "lastName":
      return isValidName(v.lastName) ? undefined : "Enter your last name.";
    case "phone":
      return isValidPhone(v.phone) ? undefined : "Enter a 10-digit US phone number.";
    case "email":
      return isValidEmail(v.email) ? undefined : "Enter a valid email address.";
    case "zip":
      return isValidZip(v.zip) ? undefined : "Enter a 5-digit ZIP code.";
    case "county":
      return oneOf(countyOptions, v.county) ? undefined : "Choose your county.";
    case "primaryUse":
      return oneOf(primaryUseOptions, v.primaryUse) ? undefined : "Choose how you'll mainly use the vehicle.";
    case "platforms":
      return v.platforms.length <= MAX.platforms ? undefined : `Keep this under ${MAX.platforms} characters.`;
    case "platformStatus":
      return oneOf(platformStatusOptions, v.platformStatus) ? undefined : "Choose one option.";
    case "urgency":
      return oneOf(urgencyOptions, v.urgency) ? undefined : "Choose how soon you need a vehicle.";
    case "age": {
      if (!/^\d{1,3}$/.test(v.age)) return "Enter your age as a number.";
      const n = Number(v.age);
      return n >= AGE_MIN && n <= AGE_MAX ? undefined : "Enter a valid age.";
    }
    case "hasLicense":
      return v.hasLicense === "yes" || v.hasLicense === "no" ? undefined : "Choose Yes or No.";
    case "licenseState":
      // Only applies when the license answer is Yes. A hidden field never blocks submission.
      if (v.hasLicense !== "yes") return undefined;
      return oneOf(usStates, v.licenseState) ? undefined : "Choose the state that issued your license.";
    case "hasVehicle":
      return v.hasVehicle === "yes" || v.hasVehicle === "no" ? undefined : "Choose Yes or No.";
    case "preferredVehicleType":
      return v.preferredVehicleType === "" || oneOf(vehicleTypeOptions, v.preferredVehicleType)
        ? undefined
        : "Choose a vehicle type from the list.";
    case "pickupArea":
      return v.pickupArea === "" || oneOf(pickupAreaOptions, v.pickupArea) ? undefined : "Choose an area from the list.";
    case "notes":
      return v.notes.length <= MAX.notes ? undefined : `Keep notes under ${MAX.notes} characters.`;
    case "consent":
      return v.consent === true ? undefined : "Please agree to be contacted so we can respond to your application.";
    case "vehicleId":
      return /^$|^[a-z0-9-]{1,40}$/.test(v.vehicleId) ? undefined : "Unknown vehicle.";
  }
}

export function validateFields(fields: readonly ApplicationField[], v: ApplicationValues): FieldErrors<ApplicationField> {
  const errors: FieldErrors<ApplicationField> = {};
  for (const f of fields) {
    const e = validateApplicationField(f, v);
    if (e) errors[f] = e;
  }
  return errors;
}

export function validateStep(step: StepId, v: ApplicationValues): FieldErrors<ApplicationField> {
  const def = applicationSteps.find((s) => s.id === step);
  return def ? validateFields(def.fields, v) : {};
}

export function validateApplication(v: ApplicationValues): FieldErrors<ApplicationField> {
  return validateFields([...applicationSteps.flatMap((s) => s.fields), "vehicleId"], v);
}

/**
 * Rebuild the submission FIELD BY FIELD from an untrusted body. Never spread
 * the request body — unknown keys are simply dropped.
 */
export function parseApplicationBody(body: unknown): ApplicationValues {
  const b = asRecord(body);
  return {
    firstName: readString(b, "firstName", MAX.name + 1),
    lastName: readString(b, "lastName", MAX.name + 1),
    phone: readString(b, "phone", 30),
    email: readString(b, "email", MAX.email + 1),
    zip: readString(b, "zip", 10),
    county: readString(b, "county", MAX.short),
    primaryUse: readString(b, "primaryUse", MAX.short),
    platforms: readString(b, "platforms", MAX.platforms + 1),
    platformStatus: readString(b, "platformStatus", MAX.short),
    urgency: readString(b, "urgency", MAX.short),
    age: readString(b, "age", 5),
    hasLicense: readString(b, "hasLicense", 5),
    licenseState: readString(b, "licenseState", MAX.short),
    hasVehicle: readString(b, "hasVehicle", 5),
    preferredVehicleType: readString(b, "preferredVehicleType", MAX.short),
    pickupArea: readString(b, "pickupArea", MAX.short),
    notes: readString(b, "notes", MAX.notes + 1),
    consent: b.consent === true,
    vehicleId: readString(b, "vehicleId", 41),
  };
}

export function isHoneypotFilled(body: unknown): boolean {
  return readString(asRecord(body), HONEYPOT_FIELD, 200) !== "";
}

/** The clean, typed record that is stored or forwarded after validation. */
export interface ApplicationRecord {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  zip: string;
  county: string;
  primaryUse: string;
  platforms: string | null;
  platformStatus: string;
  urgency: string;
  age: number;
  hasLicense: boolean;
  licenseState: string | null;
  hasVehicle: boolean;
  preferredVehicleType: string | null;
  pickupArea: string | null;
  applicantNotes: string | null;
  consent: true;
}

/** Normalise validated values: 10-digit phone, lowercase email, typed answers. */
export function toApplicationRecord(v: ApplicationValues): ApplicationRecord {
  const hasLicense = v.hasLicense === "yes";
  return {
    firstName: v.firstName,
    lastName: v.lastName,
    phone: normalizePhone(v.phone),
    email: normalizeEmail(v.email),
    zip: v.zip,
    county: v.county,
    primaryUse: v.primaryUse,
    platforms: v.platforms || null,
    platformStatus: v.platformStatus,
    urgency: v.urgency,
    age: Number(v.age),
    hasLicense,
    licenseState: hasLicense ? v.licenseState : null,
    hasVehicle: v.hasVehicle === "yes",
    preferredVehicleType: v.preferredVehicleType || null,
    pickupArea: v.pickupArea || null,
    applicantNotes: v.notes || null,
    consent: true,
  };
}
