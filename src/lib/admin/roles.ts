/** Staff roles and what each may do. Mirrors the database policies (which are the real gate). */
export type StaffRole = "owner" | "sales" | "fleet_manager" | "viewer";

export const roleLabels: Record<StaffRole, string> = {
  owner: "Owner",
  sales: "Sales",
  fleet_manager: "Fleet Manager",
  viewer: "Viewer",
};

/** UI permissions — used only to hide controls a person can't use. */
export const can = {
  workApplications: (r: StaffRole) => r === "owner" || r === "sales",
  editContacts: (r: StaffRole) => r === "owner" || r === "sales",
  noteContacts: (r: StaffRole) => r === "owner" || r === "sales" || r === "fleet_manager",
  editCars: (r: StaffRole) => r === "owner" || r === "fleet_manager",
  deleteAnything: (r: StaffRole) => r === "owner",
  manageStaff: (r: StaffRole) => r === "owner",
} as const;

export function isStaffRole(v: unknown): v is StaffRole {
  return v === "owner" || v === "sales" || v === "fleet_manager" || v === "viewer";
}
