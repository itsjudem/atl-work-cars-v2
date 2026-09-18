import type { MetadataRoute } from "next";
import { assetUrl, site } from "@/data/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin"] }],
    sitemap: assetUrl("/sitemap.xml"),
    host: site.url,
  };
}
