import { insuranceStatement, policies } from "@/data/policies";
import type { PolicyItem } from "@/data/types";
import { orUnknown } from "@/lib/format";

/** Definition list of policies. Unknown values render the standard fallback. */
export function PolicyList({ ids, showInsuranceNote = true }: { ids?: readonly string[]; showInsuranceNote?: boolean }) {
  const items: PolicyItem[] = ids ? policies.filter((p) => ids.includes(p.id)) : policies;
  const includesInsurance = items.some((p) => p.id === "insurance");
  return (
    <div>
      <dl className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
        {items.map((p) => (
          <div key={p.id} className="grid gap-1 px-5 py-4 sm:grid-cols-[14rem_1fr] sm:gap-6">
            <dt className="font-semibold">{p.label}</dt>
            <dd className={p.value === null ? "text-ink-soft" : undefined}>{orUnknown(p.value)}</dd>
          </div>
        ))}
      </dl>
      {showInsuranceNote && includesInsurance ? (
        <p className="mt-4 rounded-lg bg-surface-muted p-4 text-ink-soft">{insuranceStatement}</p>
      ) : null}
    </div>
  );
}
