import Link from "next/link";

/** Previous / next links that keep the current filters. */
export function Pager({ basePath, params, page, total, pageSize }: { basePath: string; params: Record<string, string | undefined>; page: number; total: number; pageSize: number }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  return (
    <nav aria-label="Pages" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
      <span className="text-ink-soft">
        {total} {total === 1 ? "record" : "records"} · page {Math.min(page, pages)} of {pages}
      </span>
      <span className="flex gap-2">
        {page > 1 ? <Link href={href(page - 1)} className="btn-secondary min-h-11 px-4 py-2">Previous</Link> : null}
        {page < pages ? <Link href={href(page + 1)} className="btn-secondary min-h-11 px-4 py-2">Next</Link> : null}
      </span>
    </nav>
  );
}
