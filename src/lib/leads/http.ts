import "server-only";

export const MAX_BODY_BYTES = 16_000;

export type ReadJsonResult = { ok: true; body: unknown } | { ok: false; response: Response };

const noStore = { "cache-control": "no-store" };

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: noStore });
}

/** Read a small JSON body, answering 415/413/400 for anything else. */
export async function readJson(request: Request): Promise<ReadJsonResult> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.toLowerCase().includes("application/json")) {
    return { ok: false, response: json({ ok: false, error: "Send the form as JSON." }, 415) };
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    return { ok: false, response: json({ ok: false, error: "Submission is too large." }, 413) };
  }
  try {
    return { ok: true, body: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, response: json({ ok: false, error: "Submission could not be read." }, 400) };
  }
}
