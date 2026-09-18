import { vehicleLabel } from "@/data/vehicles";
import { getPublicVehicle } from "@/lib/vehicles/public";
import {
  isHoneypotFilled,
  parseApplicationBody,
  toApplicationRecord,
  validateApplication,
} from "@/lib/application-schema";
import { deliver } from "@/lib/leads/deliver";
import { json, readJson } from "@/lib/leads/http";
import { generateReference } from "@/lib/leads/reference-id";
import { hasErrors } from "@/lib/validation";

const SAVE_FAILED = "We couldn't save your application just now. Please try again in a minute, or call or text us.";

export async function POST(request: Request): Promise<Response> {
  const read = await readJson(request);
  if (!read.ok) return read.response;

  // Reference and timestamp are created here, never in the browser.
  let reference = generateReference();
  const submittedAt = new Date().toISOString();

  // Bots fill the hidden field: discard quietly, but look like a normal success.
  if (isHoneypotFilled(read.body)) {
    return json({ ok: true, reference });
  }

  const values = parseApplicationBody(read.body);
  const errors = validateApplication(values);
  if (hasErrors(errors)) {
    return json({ ok: false, error: "Please fix the highlighted fields.", errors }, 400);
  }

  const vehicle = values.vehicleId ? await getPublicVehicle(values.vehicleId) : undefined;

  const data = toApplicationRecord(values);
  const vehicleInfo = vehicle ? { id: vehicle.id, label: vehicleLabel(vehicle), isSample: vehicle.isPlaceholder } : null;

  try {
    let result = await deliver({ type: "application", reference, submittedAt, vehicle: vehicleInfo, data });
    // References are random; on the rare collision, try once more with a fresh one.
    if (result.duplicateReference) {
      reference = generateReference();
      result = await deliver({ type: "application", reference, submittedAt, vehicle: vehicleInfo, data });
    }
    if (result.requiredFailed) return json({ ok: false, error: SAVE_FAILED }, 500);
  } catch (err) {
    console.error("[apply] unexpected error", err instanceof Error ? err.message : err);
    return json({ ok: false, error: SAVE_FAILED }, 500);
  }

  return json({ ok: true, reference });
}
