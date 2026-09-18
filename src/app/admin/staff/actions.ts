"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { friendlyDbError } from "@/lib/admin/errors";
import { requestOrigin } from "@/lib/admin/origin";
import { isStaffRole } from "@/lib/admin/roles";
import { requireStaff } from "@/lib/admin/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isValidEmail, normalizeEmail } from "@/lib/validation";

const STAFF = "/admin/staff/";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function field(form: FormData, name: string, max = 300): string {
  const v = form.get(name);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function back(kind: "ok" | "error", message: string): never {
  redirect(`${STAFF}?${kind}=${encodeURIComponent(message)}`);
}

/** Every staff action starts here: the requester must be an ACTIVE Owner right now. */
async function requireOwner() {
  const me = await requireStaff(STAFF);
  if (me.role !== "owner") back("error", "Only an Owner can manage staff.");
  return me;
}

/** Invite by email. Uses the secret key, but only after confirming the requester is an Owner. */
export async function inviteStaff(form: FormData): Promise<void> {
  const me = await requireOwner();
  const fullName = field(form, "full_name", 100);
  const email = normalizeEmail(field(form, "email", 254));
  const role = field(form, "role", 20);

  if (!/^[\p{L}][\p{L}\p{M}' .-]{0,99}$/u.test(fullName)) back("error", "Enter the person's name.");
  if (!isValidEmail(email)) back("error", "Enter a valid email address.");
  // Owners are never created by invite; invite as another role and promote afterwards.
  if (!isStaffRole(role) || role === "owner") back("error", "Choose Sales, Fleet Manager or Viewer.");

  const admin = createAdminClient();
  if (!admin) back("error", "The admin isn't connected to the database.");

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, role, invited_by: me.id },
    redirectTo: `${await requestOrigin()}/auth/confirm/`,
  });
  if (error) {
    console.error("[staff] invite failed", error.status, error.code);
    if (error.code === "email_exists" || error.status === 422) back("error", "Someone with that email already has an account.");
    if (error.status === 429) back("error", "Too many emails sent recently. Wait a while and try again.");
    back("error", "The invite couldn't be sent. Check the email settings and try again.");
  }
  revalidatePath(STAFF);
  back("ok", `Invite sent to ${email}.`);
}

/** Change a role. Runs as the Owner (row-level security + the database guard apply). */
export async function changeRole(form: FormData): Promise<void> {
  const me = await requireOwner();
  const target = field(form, "id", 40);
  const role = field(form, "role", 20);
  if (!UUID.test(target) || !isStaffRole(role)) back("error", "Something went wrong. Please try again.");
  if (target === me.id) back("error", "You can't change your own role.");

  const supabase = await createClient();
  if (!supabase) back("error", "The admin isn't connected to the database.");
  const { data, error } = await supabase.from("profiles").update({ role }).eq("id", target).select("id");
  if (error) back("error", friendlyDbError(error));
  if (!data?.length) back("error", "You don't have permission to do that.");
  revalidatePath(STAFF);
  back("ok", "Role updated.");
}

/**
 * Deactivate or reactivate. The database function re-checks the Owner, refuses
 * self-deactivation and protects the last active Owner. Deactivated people are
 * also banned in Supabase Auth, so they can't sign back in at all.
 */
export async function setActive(form: FormData): Promise<void> {
  const me = await requireOwner();
  const target = field(form, "id", 40);
  const active = field(form, "active", 5) === "true";
  if (!UUID.test(target)) back("error", "Something went wrong. Please try again.");
  if (target === me.id) back("error", "You can't deactivate yourself.");

  const admin = createAdminClient();
  if (!admin) back("error", "The admin isn't connected to the database.");

  const { error } = await admin.rpc("admin_set_staff_active", { p_actor: me.id, p_target: target, p_active: active });
  if (error) back("error", friendlyDbError(error));

  const ban = await admin.auth.admin.updateUserById(target, { ban_duration: active ? "none" : "876000h" });
  if (ban.error) console.error("[staff] ban update failed", ban.error.status, ban.error.code);

  revalidatePath(STAFF);
  back("ok", active ? "Access restored." : "Access turned off. They're signed out on their next click.");
}
