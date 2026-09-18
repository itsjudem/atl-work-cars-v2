import type { NextConfig } from "next";

// No `output: "export"` — ever. Phase 2 adds a server-rendered admin, and the
// Cloudflare move uses an adapter (vinext or OpenNext), not static export.
const nextConfig: NextConfig = {
  // Every URL ends in "/" so canonicals, the sitemap and shared links such as
  // /apply/?vehicle=awc-102 are identical on every host.
  trailingSlash: true,
  poweredByHeader: false,
  // Car photos are served from Supabase Storage.
  images: { remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/vehicle-photos/**" }] },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // Admin: never indexed, never cached by a CDN or the browser.
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
