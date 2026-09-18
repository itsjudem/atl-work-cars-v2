import type { MetadataRoute } from "next";
import { publishedLocations } from "@/data/locations";
import { absoluteUrl } from "@/data/site";

/** Published pages only. Unpublished local pages and /api are never listed. */
const staticPaths = [
  "/",
  "/cars/",
  "/how-it-works/",
  "/requirements/",
  "/service-area/",
  "/faq/",
  "/contact/",
  "/apply/",
  "/rental-policies/",
  "/privacy-policy/",
  "/terms-of-service/",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [...staticPaths, ...publishedLocations().map((l) => `/${l.slug}/`)];
  return paths.map((p) => ({
    url: absoluteUrl(p),
    changeFrequency: p === "/" || p === "/cars/" ? "weekly" : "monthly",
    priority: p === "/" ? 1 : p === "/apply/" || p === "/cars/" ? 0.9 : 0.6,
  }));
}
