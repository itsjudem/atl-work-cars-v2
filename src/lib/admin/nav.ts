import "server-only";
import { redirect } from "next/navigation";

export type SearchParams = Record<string, string | string[] | undefined>;

export function one(params: SearchParams, key: string): string | undefined {
  const v = params[key];
  return typeof v === "string" ? v : undefined;
}

export function pageNumber(params: SearchParams): number {
  const n = Number(one(params, "page") ?? "1");
  return Number.isInteger(n) && n > 0 && n < 10_000 ? n : 1;
}

export const PAGE_SIZE = 25;

/** Redirect back to an admin page with a success or error message. */
export function backTo(path: string, kind: "ok" | "error", message: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${kind}=${encodeURIComponent(message)}`);
}

/** Text safe to put inside a PostgREST or() filter (no commas, parentheses or wildcards). */
export function searchTerm(raw: string | undefined): string {
  return (raw ?? "").replace(/[,()*%\\:"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
