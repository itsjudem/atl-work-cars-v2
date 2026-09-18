import { getVehicle, vehicleLabel } from "@/data/vehicles";
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

export async function POST(request: Request): Promise<Response> {
  const read = await readJson(request);
  if (!read.ok) return read.response;

  // Reference and timestamp are created here, never in the browser.
  const reference = generateReference();
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

  const vehicle = values.vehicleId ? getVehicle(values.vehicleId) : undefined;

  try {
    await deliver({
      type: "application",
      reference,
      submittedAt,
      vehicle: vehicle ? { id: vehicle.id, label: vehicleLabel(vehicle), isSample: vehicle.isPlaceholder } : null,
      data: toApplicationRecord(values),
    });
  } catch (err) {
    console.error("[apply] unexpected error", err instanceof Error ? err.message : err);
    return json({ ok: false, error: "Something went wrong on our side. Please call or text us instead." }, 500);
  }

  return json({ ok: true, reference });
}
