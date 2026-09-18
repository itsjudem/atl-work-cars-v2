"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { friendlyDbError, NO_PERMISSION } from "@/lib/admin/errors";
import { backTo, UUID } from "@/lib/admin/nav";
import { can } from "@/lib/admin/roles";
import { requireStaff } from "@/lib/admin/session";
import { CODE_PATTERN, readVehicleFields } from "@/lib/admin/vehicle-fields";
import { createClient } from "@/lib/supabase/server";
import { PHOTO_BUCKET } from "@/lib/vehicles/photo";

/**
 * Car actions (Owner + Fleet Manager; delete Owner only). All run as the
 * logged-in staff member so the database permissions and rules apply:
 * a rented car must have a renter, a rented car can't be deleted, and every
 * change is written to history by the database.
 */

function field(form: FormData, name: string, max = 100): string {
  const v = form.get(name);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

const detail = (id: string) => `/admin/cars/${id}/`;

/** The public pages that show cars — refreshed immediately after any change. */
function refreshPublic() {
  revalidatePath("/");
  revalidatePath("/cars/");
  revalidatePath("/admin/cars/");
}

async function setup(form: FormData, need: "edit" | "delete") {
  const id = field(form, "id", 40);
  if (!UUID.test(id)) backTo("/admin/cars/", "error", "That car wasn't found.");
  const me = await requireStaff(detail(id));
  const allowed = need === "delete" ? can.deleteAnything(me.role) : can.editCars(me.role);
  if (!allowed) backTo(detail(id), "error", NO_PERMISSION);
  const supabase = await createClient();
  if (!supabase) backTo(detail(id), "error", "The admin isn't connected to the database.");
  return { id, supabase };
}

async function update(form: FormData, values: Record<string, unknown>, ok: string) {
  const { id, supabase } = await setup(form, "edit");
  const { data, error } = await supabase.from("vehicles").update(values).eq("id", id).select("id");
  if (error) backTo(detail(id), "error", friendlyDbError(error));
  if (!data?.length) backTo(detail(id), "error", NO_PERMISSION);
  refreshPublic();
  backTo(detail(id), "ok", ok);
}

export async function createCar(form: FormData): Promise<void> {
  const me = await requireStaff("/admin/cars/new/");
  if (!can.editCars(me.role)) backTo("/admin/cars/new/", "error", NO_PERMISSION);
  const code = field(form, "code", 40).toLowerCase();
  if (!CODE_PATTERN.test(code)) backTo("/admin/cars/new/", "error", "Enter a code using lowercase letters, numbers and dashes, e.g. awc-201.");
  const { values, error } = readVehicleFields(form);
  if (error) backTo("/admin/cars/new/", "error", error);

  const supabase = await createClient();
  if (!supabase) backTo("/admin/cars/new/", "error", "The admin isn't connected to the database.");
  const { data, error: dbError } = await supabase.from("vehicles").insert({ ...values, code, status: "available" }).select("id").single();
  if (dbError || !data) {
    backTo("/admin/cars/new/", "error", dbError?.code === "23505" ? `The code ${code} is already used by another car.` : friendlyDbError(dbError));
  }
  refreshPublic();
  redirect(`${detail(data.id as string)}?ok=${encodeURIComponent("Car added. It's hidden from the website until you tick “Show on website”.")}`);
}

export async function saveCar(form: FormData): Promise<void> {
  const { values, error } = readVehicleFields(form);
  if (error) backTo(detail(field(form, "id", 40)), "error", error);
  await update(form, { ...values }, "Car saved.");
}

/** Available or In repair. Leaving Rented removes the renter — the page asks first. */
export async function setCarStatus(form: FormData): Promise<void> {
  const status = field(form, "status", 20);
  if (status !== "available" && status !== "in_repair") backTo(detail(field(form, "id", 40)), "error", "Choose Available or In repair.");
  await update(form, { status, renter_contact_id: null, rented_since: null }, status === "available" ? "Status set to Available." : "Status set to In repair.");
}

/** Rent the car to a contact from a given date (also used to change the renter). */
export async function assignRenter(form: FormData): Promise<void> {
  const contactId = field(form, "contact_id", 40);
  const since = field(form, "rented_since", 10);
  const id = field(form, "id", 40);
  if (!UUID.test(contactId)) backTo(detail(id), "error", "Choose a contact.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(since) || Number.isNaN(Date.parse(since))) backTo(detail(id), "error", "Choose the rental start date.");
  await update(form, { status: "rented", renter_contact_id: contactId, rented_since: since }, "Renter assigned. The car is now Rented.");
}

export async function setPublished(form: FormData): Promise<void> {
  const on = field(form, "value", 5) === "true";
  await update(form, { is_published: on }, on ? "The car is now shown on the website." : "The car is now hidden from the website.");
}

const MAX_PHOTO = 500 * 1024;
const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Upload or replace the photo. A written description (alt text) is required. */
export async function uploadPhoto(form: FormData): Promise<void> {
  const { id, supabase } = await setup(form, "edit");
  const alt = field(form, "photo_alt", 300);
  const file = form.get("photo");
  if (!alt) backTo(detail(id), "error", "Describe the photo for people who can't see it (e.g. “Silver 2021 Toyota Prius, front view”).");
  if (!(file instanceof File) || file.size === 0) backTo(detail(id), "error", "Choose a photo to upload.");
  const ext = PHOTO_TYPES[file.type];
  if (!ext) backTo(detail(id), "error", "Use a JPG, PNG or WebP photo.");
  if (file.size > MAX_PHOTO) backTo(detail(id), "error", "That photo is over 500 KB. Resize or compress it and try again.");

  const { data: car } = await supabase.from("vehicles").select("code, photo_path").eq("id", id).maybeSingle();
  if (!car) backTo(detail(id), "error", "That car wasn't found.");
  const path = `${car.code as string}-${Date.now()}.${ext}`;
  const { error: upError } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (upError) {
    console.error("[cars] photo upload failed", upError.message);
    backTo(detail(id), "error", "The photo couldn't be uploaded. Please try again.");
  }
  const { error } = await supabase.from("vehicles").update({ photo_path: path, photo_alt: alt }).eq("id", id);
  if (error) {
    await supabase.storage.from(PHOTO_BUCKET).remove([path]);
    backTo(detail(id), "error", friendlyDbError(error));
  }
  if (car.photo_path) await supabase.storage.from(PHOTO_BUCKET).remove([car.photo_path as string]);
  refreshPublic();
  backTo(detail(id), "ok", "Photo saved.");
}

export async function savePhotoAlt(form: FormData): Promise<void> {
  const alt = field(form, "photo_alt", 300);
  if (!alt) backTo(detail(field(form, "id", 40)), "error", "The photo description can't be empty.");
  await update(form, { photo_alt: alt }, "Photo description saved.");
}

export async function removePhoto(form: FormData): Promise<void> {
  const { id, supabase } = await setup(form, "edit");
  const { data: car } = await supabase.from("vehicles").select("photo_path").eq("id", id).maybeSingle();
  const { data, error } = await supabase.from("vehicles").update({ photo_path: null, photo_alt: null }).eq("id", id).select("id");
  if (error) backTo(detail(id), "error", friendlyDbError(error));
  if (!data?.length) backTo(detail(id), "error", NO_PERMISSION);
  if (car?.photo_path) await supabase.storage.from(PHOTO_BUCKET).remove([car.photo_path as string]);
  refreshPublic();
  backTo(detail(id), "ok", "Photo removed.");
}

export async function addCarNote(form: FormData): Promise<void> {
  const { id, supabase } = await setup(form, "edit");
  const body = field(form, "body", 5000);
  if (!body) backTo(detail(id), "error", "Write a note first.");
  const { error } = await supabase.from("notes").insert({ vehicle_id: id, body });
  if (error) backTo(detail(id), "error", friendlyDbError(error));
  backTo(detail(id), "ok", "Note added.");
}

export async function deleteCarNote(form: FormData): Promise<void> {
  const { id, supabase } = await setup(form, "delete");
  const noteId = field(form, "note_id", 40);
  if (!UUID.test(noteId)) backTo(detail(id), "error", "That note wasn't found.");
  const { data, error } = await supabase.from("notes").delete().eq("id", noteId).eq("vehicle_id", id).select("id");
  if (error) backTo(detail(id), "error", friendlyDbError(error));
  if (!data?.length) backTo(detail(id), "error", NO_PERMISSION);
  backTo(detail(id), "ok", "Note deleted.");
}

/** Permanent, Owner only, after confirmation. The database refuses while the car is rented. */
export async function deleteCar(form: FormData): Promise<void> {
  const { id, supabase } = await setup(form, "delete");
  if (field(form, "confirm", 10) !== "yes") backTo(`${detail(id)}?confirm=delete`, "error", "Confirm the delete first.");
  const { data, error } = await supabase.from("vehicles").delete().eq("id", id).select("code, photo_path");
  if (error) backTo(detail(id), "error", error.code === "AWC06" ? "This car is rented. Change the car's status first." : friendlyDbError(error));
  if (!data?.length) backTo(detail(id), "error", NO_PERMISSION);
  const car = data[0] as { code: string; photo_path: string | null };
  if (car.photo_path) await supabase.storage.from(PHOTO_BUCKET).remove([car.photo_path]);
  refreshPublic();
  backTo("/admin/cars/", "ok", `Car ${car.code} deleted.`);
}
