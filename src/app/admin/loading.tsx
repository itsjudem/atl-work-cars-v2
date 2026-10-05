/** Shown while an admin page is being fetched, so a click always does something visible. */
export default function AdminLoading() {
  return (
    <div role="status" aria-live="polite" className="grid gap-4">
      <p className="text-ink-soft">Loading…</p>
      <div className="h-9 w-64 animate-pulse rounded-lg bg-surface" />
      <div className="h-40 animate-pulse rounded-xl bg-surface" />
    </div>
  );
}
