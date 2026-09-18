import { getSupabaseConfig } from "@/lib/supabase/config";

export const PHOTO_BUCKET = "vehicle-photos";

/** Public URL of a car photo stored in Supabase Storage (bucket is public-read). */
export function photoUrl(path: string | null): string | null {
  if (!path) return null;
  const config = getSupabaseConfig();
  if (!config) return null;
  return `${config.url}/storage/v1/object/public/${PHOTO_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
