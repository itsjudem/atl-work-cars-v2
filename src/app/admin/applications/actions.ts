"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { readContactFields } from "@/lib/admin/contact-fields";
import { friendlyDbError, NO_PERMISSION } from "@/lib/admin/errors";
import { backTo, UUID } from "@/lib/admin/nav";
import { can } from "@/lib/admin/roles";
import { requireStaff } from "@/lib/admin/session";
import { createClient } from "@/lib/supabase/server";

/**
 * Application actions. Every one re-checks the login and role on the server and
 * runs as the logged-in staff member, so the database's own permissions apply.
 * Application ANSWERS are never editable — only the staff workflow fields are.
 */

function field(form: FormData, name: string, max = 100): string {
  const v = form.get(name);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

const detail = (id: string) => `/admin/applications/${id}/`;

async function setup(form: FormData, need: "work" | "delete") {
  const id = field(form, "id", 40);
  if (!UUID.test(id)) backTo("/admin/applications/", "error", "That application wasn't found.");
  const me = await requireStaff(detail(id));
  const allowed = need === "delete" ? can.deleteAnything(me.role) : can.workApplications(me.role);
  if (!allowed) backTo(detail(id), "error", NO_PERMISSION);
  const supabase = await createClient();
  if (!supabase) backTo(detail(id), "error", "The admin isn't connected to the database.");
  return { id, me, supabase };
}

async function update(form: FormData, values: Record<string, unknown>, ok: string) {
  const { id, supabase } = await setup(form, "work");
  const { data, error } = await supabase.from("applications").update(values).eq("id", id).select("id");
  if (error) backTo(detail(id), "error", friendlyDbError(error));
  if (!data?.length) backTo(detail(id), "error", NO_PERMISSION);
  revalidatePath("/admin/applications/");
  backTo(detail(id), "ok", ok);
}

export async function setContacted(form: FormData): Promise<void> {
  const on = field(form, "value", 5) === "true";
  await update(form, { contacted: on }, on ? "Marked as contacted." : "Marked as not contacted.");
}

export async function setArchived(form: FormData): Promise<void> {
  const on = field(form, "value", 5) === "true";
  await update(form, { archived_at: on ? new Date().toISOString() : null }, on ? "Application archived." : "Application restored.");
}

export async function linkContact(form: FormData): Promise<void> {
  const contactId = field(form, "contact_id", 40);
  if (contactId && !UUID.test(contactId)) backTo("/admin/applications/", "error", "That contact wasn't found.");
  await update(form, { contact_id: contactId || null }, contactId ? "Linked to the contact." : "Contact unlinked.");
}

export async function addApplicationNote(form: FormData): Promise<void> {
  const { id, supabase } = await setup(form, "work");
  const body = field(form, "body", 5000);
  if (!body) backTo(detail(id), "error", "Write a note first.");
  const { error } = await supabase.from("notes").insert({ application_id: id, body });
  if (error) backTo(detail(id), "error", friendlyDbError(error));
  backTo(detail(id), "ok", "Note added.");
}

export async function deleteApplicationNote(form: FormData): Promise<void> {
  const { id, supabase } = await setup(form, "delete");
  const noteId = field(form, "note_id", 40);
  if (!UUID.test(noteId)) backTo(detail(id), "error", "That note wasn't found.");
  const { data, error } = await supabase.from("notes").delete().eq("id", noteId).eq("application_id", id).select("id");
  if (error) backTo(detail(id), "error", friendlyDbError(error));
  if (!data?.length) backTo(detail(id), "error", NO_PERMISSION);
  backTo(detail(id), "ok", "Note deleted.");
}

/** Permanent. Owner only; the page asks for confirmation first. Notes go with it. */
export async function deleteApplication(form: FormData): Promise<void> {
  const { id, supabase } = await setup(form, "delete");
  if (field(form, "confirm", 10) !== "yes") backTo(`${detail(id)}?confirm=delete`, "error", "Confirm the delete first.");
  const { data, error } = await supabase.from("applications").delete().eq("id", id).select("reference");
  if (error) backTo(detail(id), "error", friendlyDbError(error));
  if (!data?.length) backTo(detail(id), "error", NO_PERMISSION);
  revalidatePath("/admin/applications/");
  backTo("/admin/applications/", "ok", `Application ${data[0].reference as string} deleted.`);
}

/**
 * Create a contact from an application (source: application, not yet rated) and
 * link the two. The create page offers existing phone/email matches first.
 */
export async function createContactFromApplication(form: FormData): Promise<void> {
  const { id, supabase } = await setup(form, "work");
  const back = `/admin/applications/${id}/create-contact/`;
  const { values, error: invalid } = readContactFields(form);
  if (invalid) backTo(back, "error", invalid);

  const { data: created, error } = await supabase.from("contacts").insert({ ...values, source: "application" }).select("id").single();
  if (error || !created) backTo(back, "error", friendlyDbError(error));

  const { error: linkError } = await supabase.from("applications").update({ contact_id: created.id }).eq("id", id);
  if (linkError) backTo(back, "error", friendlyDbError(linkError));

  revalidatePath("/admin/applications/");
  redirect(`${detail(id)}?ok=${encodeURIComponent("Contact created and linked.")}`);
}
