import { bodyTypeLabels } from "@/data/vehicles";
import type { VehicleFields } from "@/lib/admin/vehicle-fields";

const input = "mt-1.5 block min-h-12 w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-ink disabled:bg-surface-muted";

/** The car details inputs, shared by "Add car" and the car page. Blank money fields show "Contact us for pricing" on the site. */
export function CarFields({ car }: { car?: Partial<VehicleFields> }) {
  const num = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));
  const box = (name: "is_featured" | "is_published" | "is_sample", label: string, hint: string) => (
    <div className="flex items-start gap-3 sm:col-span-2">
      <input id={name} name={name} type="checkbox" defaultChecked={Boolean(car?.[name])} className="mt-1 size-5" />
      <label htmlFor={name}>
        <span className="font-semibold">{label}</span>
        <span className="block text-sm text-ink-soft">{hint}</span>
      </label>
    </div>
  );
  return (
    <>
      <div>
        <label htmlFor="year" className="block font-semibold">Model year</label>
        <input id="year" name="year" inputMode="numeric" required maxLength={4} defaultValue={num(car?.year)} className={input} />
      </div>
      <div>
        <label htmlFor="body_type" className="block font-semibold">Body type</label>
        <select id="body_type" name="body_type" required defaultValue={car?.body_type ?? ""} className={input}>
          <option value="" disabled>Choose…</option>
          {Object.entries(bodyTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="make" className="block font-semibold">Make</label>
        <input id="make" name="make" required maxLength={40} defaultValue={car?.make ?? ""} placeholder="Toyota" className={input} />
      </div>
      <div>
        <label htmlFor="model" className="block font-semibold">Model</label>
        <input id="model" name="model" required maxLength={40} defaultValue={car?.model ?? ""} placeholder="Camry" className={input} />
      </div>
      <div>
        <label htmlFor="trim" className="block font-semibold">Trim <span className="font-normal text-ink-soft">(optional)</span></label>
        <input id="trim" name="trim" maxLength={40} defaultValue={car?.trim ?? ""} placeholder="LE" className={input} />
      </div>
      <div>
        <label htmlFor="seats" className="block font-semibold">Seats</label>
        <input id="seats" name="seats" inputMode="numeric" required maxLength={2} defaultValue={num(car?.seats ?? 5)} className={input} />
      </div>
      <div>
        <label htmlFor="weekly_rate" className="block font-semibold">Weekly rate, $ <span className="font-normal text-ink-soft">(blank = “Contact us”)</span></label>
        <input id="weekly_rate" name="weekly_rate" inputMode="numeric" maxLength={10} defaultValue={num(car?.weekly_rate)} className={input} />
      </div>
      <div>
        <label htmlFor="deposit" className="block font-semibold">Deposit, $ <span className="font-normal text-ink-soft">(optional)</span></label>
        <input id="deposit" name="deposit" inputMode="numeric" maxLength={10} defaultValue={num(car?.deposit)} className={input} />
      </div>
      <div>
        <label htmlFor="odometer" className="block font-semibold">Odometer, miles <span className="font-normal text-ink-soft">(optional)</span></label>
        <input id="odometer" name="odometer" inputMode="numeric" maxLength={10} defaultValue={num(car?.odometer)} className={input} />
      </div>
      <div>
        <label htmlFor="fuel_economy" className="block font-semibold">Fuel economy, MPG <span className="font-normal text-ink-soft">(optional)</span></label>
        <input id="fuel_economy" name="fuel_economy" inputMode="decimal" maxLength={8} defaultValue={num(car?.fuel_economy)} className={input} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="mileage_policy" className="block font-semibold">Mileage policy <span className="font-normal text-ink-soft">(optional)</span></label>
        <input id="mileage_policy" name="mileage_policy" maxLength={200} defaultValue={car?.mileage_policy ?? ""} className={input} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="rideshare_note" className="block font-semibold">Vehicle facts <span className="font-normal text-ink-soft">(doors, seats, year — no platform promises)</span></label>
        <input id="rideshare_note" name="rideshare_note" maxLength={300} defaultValue={car?.rideshare_note ?? ""} className={input} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="pickup_location" className="block font-semibold">Pickup area <span className="font-normal text-ink-soft">(optional)</span></label>
        <input id="pickup_location" name="pickup_location" maxLength={120} defaultValue={car?.pickup_location ?? ""} className={input} />
      </div>
      {box("is_published", "Show on website", "Visitors see this car on the Cars page.")}
      {box("is_featured", "Featured", "Shown first, and on the home page.")}
      {box("is_sample", "Sample listing", "Shows a “Sample listing” badge and hides odometer and MPG.")}
    </>
  );
}
