/** THE contact-form rules — shared by the browser form and the API route. */
import {
  asRecord,
  type FieldErrors,
  isValidEmail,
  isValidName,
  isValidPhone,
  normalizeEmail,
  normalizePhone,
  readString,
} from "./validation";

export interface ContactValues {
  firstName: string;
  lastName: string;
  phone: string;
  /** Optional. */
  email: string;
  message: string;
}

export type ContactField = keyof ContactValues;

export const emptyContact: ContactValues = { firstName: "", lastName: "", phone: "", email: "", message: "" };

export const CONTACT_MESSAGE_MAX = 2000;

export function validateContactField(field: ContactField, v: ContactValues): string | undefined {
  switch (field) {
    case "firstName":
      return isValidName(v.firstName) ? undefined : "Enter your first name.";
    case "lastName":
      return isValidName(v.lastName) ? undefined : "Enter your last name.";
    case "phone":
      return isValidPhone(v.phone) ? undefined : "Enter a 10-digit US phone number.";
    case "email":
      return v.email === "" || isValidEmail(v.email) ? undefined : "Enter a valid email address, or leave it blank.";
    case "message":
      if (v.message.trim().length < 2) return "Enter a message.";
      return v.message.length <= CONTACT_MESSAGE_MAX ? undefined : `Keep your message under ${CONTACT_MESSAGE_MAX} characters.`;
  }
}

export function validateContact(v: ContactValues): FieldErrors<ContactField> {
  const errors: FieldErrors<ContactField> = {};
  for (const f of ["firstName", "lastName", "phone", "email", "message"] as const) {
    const e = validateContactField(f, v);
    if (e) errors[f] = e;
  }
  return errors;
}

/** Rebuild field by field from an untrusted body. */
export function parseContactBody(body: unknown): ContactValues {
  const b = asRecord(body);
  return {
    firstName: readString(b, "firstName", 51),
    lastName: readString(b, "lastName", 51),
    phone: readString(b, "phone", 30),
    email: readString(b, "email", 255),
    message: readString(b, "message", CONTACT_MESSAGE_MAX + 1),
  };
}

export interface ContactRecord {
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  message: string;
}

export function toContactRecord(v: ContactValues): ContactRecord {
  return {
    firstName: v.firstName,
    lastName: v.lastName,
    phone: normalizePhone(v.phone),
    email: v.email ? normalizeEmail(v.email) : null,
    message: v.message,
  };
}
