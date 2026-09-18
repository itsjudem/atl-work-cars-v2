import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isStaffRole, type StaffRole } from "./roles";

export interface Staff {
  id: string;
  email: string;
  fullName: string;
  role: StaffRole;
}

export type StaffLookup =
  | { status: "unconfigured" }
  | { status: "signed-out" }
  | { status: "inactive" }
  | { status: "ok"; staff: Staff };

/**
 * Who is making this request. The login is verified with getClaims() (never
 * getSession()), then role and active status are read fresh from `profiles` on
 * EVERY call — so a role change or deactivation applies on the very next click.
 */
export async function lookupStaff(): Promise<StaffLookup> {
  const supabase = await createClient();
  if (!supabase) return { status: "unconfigured" };

  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { status: "signed-out" };

  // RLS only returns profiles to ACTIVE staff, so a deactivated user gets no row.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (!profile || !profile.is_active || !isStaffRole(profile.role)) return { status: "inactive" };
  return {
    status: "ok",
    staff: { id: profile.id as string, email: profile.email as string, fullName: profile.full_name as string, role: profile.role },
  };
}

/** Use at the top of every protected admin page and action. */
export async function requireStaff(returnTo = "/admin/"): Promise<Staff> {
  const result = await lookupStaff();
  if (result.status === "ok") return result.staff;
  if (result.status === "unconfigured") redirect("/admin/login/");
  if (result.status === "inactive") {
    const supabase = await createClient();
    await supabase?.auth.signOut();
    redirect("/admin/login/?reason=inactive");
  }
  redirect(`/admin/login/?next=${encodeURIComponent(safeAdminPath(returnTo))}`);
}

/** Only ever return to an /admin path on this site. */
export function safeAdminPath(p: string | null | undefined): string {
  if (!p || !p.startsWith("/admin/") || p.startsWith("//") || p.includes("\\")) return "/admin/";
  if (["/admin/login/", "/admin/forgot-password/", "/admin/set-password/"].includes(p)) return "/admin/";
  return p;
}
