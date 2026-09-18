import { HONEYPOT_FIELD } from "@/lib/application-schema";
import { parseContactBody, toContactRecord, validateContact } from "@/lib/contact-schema";
import { deliver } from "@/lib/leads/deliver";
import { json, readJson } from "@/lib/leads/http";
import { asRecord, hasErrors, readString } from "@/lib/validation";

export async function POST(request: Request): Promise<Response> {
  const read = await readJson(request);
  if (!read.ok) return read.response;

  if (readString(asRecord(read.body), HONEYPOT_FIELD, 200) !== "") {
    return json({ ok: true });
  }

  const values = parseContactBody(read.body);
  const errors = validateContact(values);
  if (hasErrors(errors)) {
    return json({ ok: false, error: "Please fix the highlighted fields.", errors }, 400);
  }

  try {
    await deliver({ type: "contact", submittedAt: new Date().toISOString(), data: toContactRecord(values) });
  } catch (err) {
    console.error("[contact] unexpected error", err instanceof Error ? err.message : err);
    return json({ ok: false, error: "Something went wrong on our side. Please call or text us instead." }, 500);
  }

  return json({ ok: true });
}
