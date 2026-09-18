/**
 * Contact details as staff edit them — the SAME rules as the public form:
 * 10-digit phone, valid email, 5-digit ZIP, county from the list.
 */
import { countyOptions } from "@/data/form-options";
import { isValidEmail, isValidName, isValidPhone, isValidZip, normalizeEmail, normalizePhone } from "@/lib/validation";

export interface ContactFields {
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  zip: string | null;
  county: string | null;
}

function field(form: FormData, name: string, max: number): string {
  const v = form.get(name);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export function readContactFields(form: FormData): { values: ContactFields; error: string | null } {
  const first = field(form, "first_name", 51);
  const last = field(form, "last_name", 51);
  const phone = field(form, "phone", 30);
  const email = field(form, "email", 255);
  const zip = field(form, "zip", 10);
  const county = field(form, "county", 80);

  const values: ContactFields = {
    first_name: first,
    last_name: last,
    phone: phone ? normalizePhone(phone) : null,
    email: email ? normalizeEmail(email) : null,
    zip: zip || null,
    county: county || null,
  };

  let error: string | null = null;
  if (!isValidName(first) || !isValidName(last)) error = "Enter a first and last name.";
  else if (!phone && !email) error = "Enter a phone number or an email address.";
  else if (phone && !isValidPhone(phone)) error = "Enter a 10-digit US phone number.";
  else if (email && !isValidEmail(email)) error = "Enter a valid email address.";
  else if (zip && !isValidZip(zip)) error = "Enter a 5-digit ZIP code.";
  else if (county && !countyOptions.includes(county)) error = "Choose a county from the list.";
  return { values, error };
}
