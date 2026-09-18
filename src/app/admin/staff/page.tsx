import type { Metadata } from "next";
import { Notice } from "@/components/admin/AuthCard";
import { roleLabels, type StaffRole } from "@/lib/admin/roles";
import { requireStaff } from "@/lib/admin/session";
import { formatAtlanta } from "@/lib/admin/time";
import { createClient } from "@/lib/supabase/server";
import { changeRole, inviteStaff, setActive } from "./actions";

export const metadata: Metadata = { title: { absolute: "Staff | ATL Work Cars Admin" } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

interface StaffRow {
  id: string;
  email: string;
  full_name: string;
  role: StaffRole;
  is_active: boolean;
  invited_at: string;
  last_sign_in_at: string | null;
}

const assignable: StaffRole[] = ["owner", "sales", "fleet_manager", "viewer"];
const invitable: StaffRole[] = ["sales", "fleet_manager", "viewer"];
const field =
  "mt-1.5 block min-h-12 w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-ink focus-visible:outline-3 focus-visible:outline-brand";

export default async function StaffPage({ searchParams }: Props) {
  const me = await requireStaff("/admin/staff/");
  if (me.role !== "owner") {
    return (
      <>
        <h1 className="text-4xl font-bold">Staff</h1>
        <p className="mt-4 rounded-lg border border-line bg-surface p-4">You don&apos;t have access to this page.</p>
      </>
    );
  }

  const params = await searchParams;
  const ok = typeof params.ok === "string" ? params.ok : null;
  const error = typeof params.error === "string" ? params.error : null;

  const supabase = await createClient();
  const { data } = supabase ? await supabase.rpc("staff_directory") : { data: null };
  const staff = (data ?? []) as StaffRow[];
  const activeOwners = staff.filter((s) => s.role === "owner" && s.is_active).length;

  return (
    <>
      <h1 className="text-4xl font-bold">Staff</h1>
      <p className="mt-2 text-ink-soft">Everyone with admin access. Only Owners can see this page.</p>
      {ok ? <Notice tone="success">{ok}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      <section className="mt-8 rounded-xl border border-line bg-surface p-5 sm:p-6" aria-labelledby="invite">
        <h2 id="invite" className="text-2xl font-bold">Invite a staff member</h2>
        <p className="mt-1 text-sm text-ink-soft">They&apos;ll get an email with a link to set their password. To add another Owner, invite them first, then change their role.</p>
        <form action={inviteStaff} className="mt-5 grid gap-4 sm:grid-cols-[1fr_1fr_12rem_auto] sm:items-end">
          <div>
            <label htmlFor="full_name" className="block font-semibold">Name</label>
            <input id="full_name" name="full_name" required maxLength={100} autoComplete="off" className={field} />
          </div>
          <div>
            <label htmlFor="email" className="block font-semibold">Email</label>
            <input id="email" name="email" type="email" required maxLength={254} autoComplete="off" className={field} />
          </div>
          <div>
            <label htmlFor="role" className="block font-semibold">Role</label>
            <select id="role" name="role" required defaultValue="sales" className={field}>
              {invitable.map((r) => (
                <option key={r} value={r}>{roleLabels[r]}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary">Send invite</button>
        </form>
      </section>

      <section className="mt-8" aria-labelledby="people">
        <h2 id="people" className="text-2xl font-bold">People</h2>
        <ul className="mt-3 grid gap-3">
          {staff.map((s) => {
            const isMe = s.id === me.id;
            const lastOwner = s.role === "owner" && s.is_active && activeOwners <= 1;
            return (
              <li key={s.id} className={`rounded-xl border bg-surface p-4 sm:p-5 ${s.is_active ? "border-line" : "border-line opacity-80"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">
                      {s.full_name}
                      {isMe ? <span className="ml-2 text-sm font-normal text-ink-soft">(you)</span> : null}
                    </p>
                    <p className="text-ink-soft">{s.email}</p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {roleLabels[s.role]} ·{" "}
                      <span className={s.is_active ? "text-accent" : "text-danger"}>{s.is_active ? "Active" : "Deactivated"}</span> · Invited{" "}
                      {formatAtlanta(s.invited_at)} · Last sign-in {s.last_sign_in_at ? formatAtlanta(s.last_sign_in_at) : "never"}
                    </p>
                  </div>
                  {isMe ? (
                    <p className="text-sm text-ink-soft">You can&apos;t change your own role or deactivate yourself.</p>
                  ) : (
                    <div className="flex flex-wrap items-end gap-2">
                      <form action={changeRole} className="flex items-end gap-2">
                        <input type="hidden" name="id" value={s.id} />
                        <div>
                          <label htmlFor={`role-${s.id}`} className="block text-sm font-semibold">Role</label>
                          <select id={`role-${s.id}`} name="role" defaultValue={s.role} disabled={lastOwner} className="mt-1 block min-h-11 rounded-lg border border-line bg-surface px-3 text-ink">
                            {assignable.map((r) => (
                              <option key={r} value={r}>{roleLabels[r]}</option>
                            ))}
                          </select>
                        </div>
                        <button type="submit" disabled={lastOwner} className="btn-secondary min-h-11 px-4 py-2 disabled:opacity-50">Save role</button>
                      </form>
                      <form action={setActive}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="active" value={s.is_active ? "false" : "true"} />
                        <button type="submit" disabled={lastOwner} className="btn-secondary min-h-11 px-4 py-2 disabled:opacity-50">
                          {s.is_active ? "Deactivate" : "Reactivate"}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
                {lastOwner && !isMe ? <p className="mt-2 text-sm text-ink-soft">This is the last active Owner, so their role and access can&apos;t be changed.</p> : null}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
