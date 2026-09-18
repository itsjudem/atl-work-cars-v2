import { formatAtlanta } from "@/lib/admin/time";
import { createClient } from "@/lib/supabase/server";

const labels: Record<string, string> = {
  submitted: "Submitted from the website",
  created: "Created",
  created_from_application: "Created from an application",
  details_edited: "Details edited",
  rating_changed: "Fit / intent changed",
  contacted: "Marked contacted",
  not_contacted: "Marked not contacted",
  archived: "Archived",
  restored: "Restored",
  note_added: "Note added",
  note_deleted: "Note deleted",
  linked_contact: "Linked to a contact",
  unlinked_contact: "Unlinked from its contact",
  linked_application: "Application linked",
  vehicle_removed: "Car applied for was deleted",
  added: "Car added",
  edited: "Car edited",
  status_changed: "Status changed",
  renter_assigned: "Renter assigned",
  renter_removed: "Renter removed",
  shown_on_website: "Shown on the website",
  hidden_from_website: "Hidden from the website",
  staff_invited: "Staff invited",
  role_changed: "Role changed",
  deactivated: "Deactivated",
  reactivated: "Reactivated",
  deleted: "Deleted",
};

interface Row {
  id: number;
  actor_name: string | null;
  actor_id: string | null;
  action: string;
  details: string | null;
  created_at: string;
}

/** A record's change history, newest first, in Atlanta time. Read-only for everyone. */
export async function History({ recordType, recordId }: { recordType: string; recordId: string }) {
  const supabase = await createClient();
  const { data } = supabase
    ? await supabase
        .from("activity_log")
        .select("id, actor_name, actor_id, action, details, created_at")
        .eq("record_type", recordType)
        .eq("record_id", recordId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(200)
    : { data: null };
  const rows = (data ?? []) as Row[];

  return (
    <section className="mt-8" aria-labelledby="history">
      <h2 id="history" className="text-2xl font-bold">History</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-ink-soft">No history yet.</p>
      ) : (
        <ol className="mt-3 divide-y divide-line rounded-xl border border-line bg-surface">
          {rows.map((r) => (
            <li key={r.id} className="p-4">
              <p className="font-semibold">{labels[r.action] ?? r.action.replace(/_/g, " ")}</p>
              {r.details ? <p className="mt-0.5 break-words text-ink-soft">{r.details}</p> : null}
              <p className="mt-1 text-sm text-ink-soft">
                {formatAtlanta(r.created_at)} · {r.actor_id ? (r.actor_name ?? "Staff member") : "Website"}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
