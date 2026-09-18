import { formatAtlanta } from "@/lib/admin/time";
import { createClient } from "@/lib/supabase/server";

interface NoteRow {
  id: string;
  body: string;
  created_at: string;
  author: { full_name: string } | null;
}

type Parent = "application_id" | "contact_id" | "vehicle_id";

/**
 * Staff notes on one record. Notes can't be edited; only an Owner can delete one.
 * The add/delete forms post to server actions passed in by the page.
 */
export async function Notes({
  parent,
  parentId,
  canAdd,
  canDelete,
  addAction,
  deleteAction,
}: {
  parent: Parent;
  parentId: string;
  canAdd: boolean;
  canDelete: boolean;
  addAction: (form: FormData) => Promise<void>;
  deleteAction: (form: FormData) => Promise<void>;
}) {
  const supabase = await createClient();
  const { data } = supabase
    ? await supabase
        .from("notes")
        .select("id, body, created_at, author:profiles(full_name)")
        .eq(parent, parentId)
        .order("created_at", { ascending: false })
    : { data: null };
  const notes = (data ?? []) as unknown as NoteRow[];

  return (
    <section className="mt-8" aria-labelledby="notes">
      <h2 id="notes" className="text-2xl font-bold">Notes</h2>
      {canAdd ? (
        <form action={addAction} className="mt-3 grid gap-3">
          <input type="hidden" name="id" value={parentId} />
          <label htmlFor="note-body" className="sr-only">New note</label>
          <textarea id="note-body" name="body" required maxLength={5000} rows={3} placeholder="Add a note…" className="block w-full rounded-lg border border-line bg-surface px-3.5 py-2.5" />
          <button type="submit" className="btn-primary justify-self-start">Add note</button>
        </form>
      ) : null}
      {notes.length === 0 ? (
        <p className="mt-3 text-ink-soft">No notes yet.</p>
      ) : (
        <ul className="mt-3 grid gap-3">
          {notes.map((n) => (
            <li key={n.id} className="rounded-xl border border-line bg-surface p-4">
              <p className="whitespace-pre-wrap break-words">{n.body}</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-ink-soft">
                <span>
                  {n.author?.full_name ?? "Former staff member"} · {formatAtlanta(n.created_at)}
                </span>
                {canDelete ? (
                  <form action={deleteAction}>
                    <input type="hidden" name="id" value={parentId} />
                    <input type="hidden" name="note_id" value={n.id} />
                    <button type="submit" className="min-h-11 px-2 font-semibold text-danger underline-offset-4 hover:underline">Delete note</button>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
