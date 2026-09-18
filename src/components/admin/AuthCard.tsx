/** Centered card for the login / password pages. */
export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-line bg-surface p-6 sm:p-8">
      <h1 className="text-3xl font-bold">{title}</h1>
      {children}
    </div>
  );
}

export function Notice({ tone, children }: { tone: "error" | "info" | "success"; children: React.ReactNode }) {
  const cls =
    tone === "error"
      ? "border-danger/40 bg-danger/5 text-danger"
      : tone === "success"
        ? "border-accent/40 bg-accent-soft text-accent"
        : "border-line bg-surface-muted text-ink";
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`mt-4 rounded-lg border p-3 font-medium ${cls}`}>
      {children}
    </p>
  );
}

export const inputClass =
  "mt-1.5 block min-h-12 w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-ink focus-visible:outline-3 focus-visible:outline-brand";
