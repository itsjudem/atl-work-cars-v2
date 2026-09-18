"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { readContactFields } from "@/lib/admin/contact-fields";
import { findDuplicates } from "@/lib/admin/duplicates";
import { friendlyDbError, NO_PERMISSION } from "@/lib/admin/errors";
import { backTo, UUID } from "@/lib/admin/nav";
import { can } from "@/lib/admin/roles";
import { requireStaff } from "@/lib/admin/session";
import { createClient } from "@/lib/supabase/server";

/**
 * Contact actions. Every one re-checks login and role on the server and runs as
 * the logged-in staff member, so the database's permissions apply. Source and
 * the original message are never editable; lead_category is computed by the DB.
 */

function field(form: FormData, name: string, max = 100): string {
  const v = form.get(name);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

const detail = (id: string) => `/admin/contacts/${id}/`;
type Need = "edit" | "note" | "delete";

async function setup(form: FormData, need: Need) {
  const id = field(form, "id", 40);
  if (!UUID.test(id)) backTo("/admin/contacts/", "error", "That contact wasn't found.");
  const me = await requireStaff(detail(id));
  const allowed = need === "delete" ? can.deleteAnything(me.role) : need === "note" ? can.noteContacts(me.role) : can.editContacts(me.role);
  if (!allowed) backTo(detail(id), "error", NO_PERMISSION);
  const supabase = await createClient();
  if (!supabase) backTo(detail(id), "error", "The admin isn't connected to the database.");
  return { id, supabase };
}

async function update(form: FormData, values: Record<string, unknown>, ok: string, after?: (row: { lead_category: string; archived_at: string | null }) => string | null) {
  const { id, supabase } = await setup(form, "edit");
  const { data, error } = await supabase.from("contacts").update(values).eq("id", id).select("lead_category, archived_at");
  if (error) backTo(detail(id), "error", friendlyDbError(error));
  if (!data?.length) backTo(detail(id), "error", NO_PERMISSION);
  revalidatePath("/admin/contacts/");
  const extra = after?.(data[0] as { lead_category: string; archived_at: string | null });
  backTo(`${detail(id)}${extra ?? ""}`, "ok", ok);
}

/** Edit name / phone / email / ZIP / county — same rules as the public form. */
export async function saveContactDetails(form: FormData): Promise<void> {
  const { values, error } = readContactFields(form);
  if (error) backTo(detail(field(form, "id", 40)), "error", error);
  await update(form, { ...values }, "Contact details saved.");
}

/** Fit and intent. The database works out the category; a Dead lead is OFFERED archiving, never auto-archived. */
export async function setRating(form: FormData): Promise<void> {
  const rating = (v: string) => (v === "high" || v === "low" ? v : null);
  await update(
    form,
    { fit: rating(field(form, "fit", 5)), intent: rating(field(form, "intent", 5)) },
    "Rating saved.",
    (row) => (row.lead_category === "dead" && !row.archived_at ? "?offer=archive" : null),
  );
}

export async function setContactContacted(form: FormData): Promise<void> {
  const on = field(form, "value", 5) === "true";
  await update(form, { contacted: on }, on ? "Marked as contacted." : "Marked as not contacted.");
}

export async function setContactArchived(form: FormData): Promise<void> {
  const on = field(form, "value", 5) === "true";
  await update(form, { archived_at: on ? new Date().toISOString() : null }, on ? "Contact archived." : "Contact restored.");
}

export async function addContactNote(form: FormData): Promise<void> {
  const { id, supabase } = await setup(form, "note");
  const body = field(form, "body", 5000);
  if (!body) backTo(detail(id), "error", "Write a note first.");
  const { error } = await supabase.from("notes").insert({ contact_id: id, body });
  if (error) backTo(detail(id), "error", friendlyDbError(error));
  backTo(detail(id), "ok", "Note added.");
}

export async function deleteContactNote(form: FormData): Promise<void> {
  const { id, supabase } = await setup(form, "delete");
  const noteId = field(form, "note_id", 40);
  if (!UUID.test(noteId)) backTo(detail(id), "error", "That note wasn't found.");
  const { data, error } = await supabase.from("notes").delete().eq("id", noteId).eq("contact_id", id).select("id");
  if (error) backTo(detail(id), "error", friendlyDbError(error));
  if (!data?.length) backTo(detail(id), "error", NO_PERMISSION);
  backTo(detail(id), "ok", "Note deleted.");
}

/** Permanent. Owner only, after confirmation. Notes go too; linked applications stay but are unlinked. */
export async function deleteContact(form: FormData): Promise<void> {
  const { id, supabase } = await setup(form, "delete");
  if (field(form, "confirm", 10) !== "yes") backTo(`${detail(id)}?confirm=delete`, "error", "Confirm the delete first.");
  const { data, error } = await supabase.from("contacts").delete().eq("id", id).select("first_name, last_name");
  if (error) backTo(detail(id), "error", friendlyDbError(error));
  if (!data?.length) backTo(detail(id), "error", NO_PERMISSION);
  revalidatePath("/admin/contacts/");
  const c = data[0] as { first_name: string; last_name: string };
  backTo("/admin/contacts/", "ok", `Contact ${c.first_name} ${c.last_name.slice(0, 1)}. deleted.`);
}

export interface NewContactState {
  error?: string;
  duplicates?: { id: string; name: string; detail: string }[];
}

/**
 * Add a contact by hand (phone or walk-in). If someone already has the same
 * phone or email, warn first and offer to open them; "Save anyway" creates it.
 */
export async function createContact(_prev: NewContactState, form: FormData): Promise<NewContactState> {
  const me = await requireStaff("/admin/contacts/new/");
  if (!can.editContacts(me.role)) return { error: NO_PERMISSION };
  const { values, error } = readContactFields(form);
  if (error) return { error };

  const supabase = await createClient();
  if (!supabase) return { error: "The admin isn't connected to the database." };

  if (field(form, "force", 5) !== "yes") {
    const dupes = await findDuplicates(supabase, values.phone, values.email);
    if (dupes.length) {
      return {
        duplicates: dupes.map((d) => ({
          id: d.id,
          name: `${d.first_name} ${d.last_name}`,
          detail: [d.phone, d.email].filter(Boolean).join(" · "),
        })),
      };
    }
  }

  const { data, error: dbError } = await supabase.from("contacts").insert({ ...values, source: "manual" }).select("id").single();
  if (dbError || !data) return { error: friendlyDbError(dbError) };
  revalidatePath("/admin/contacts/");
  redirect(`${detail(data.id as string)}?ok=${encodeURIComponent("Contact added.")}`);
}
