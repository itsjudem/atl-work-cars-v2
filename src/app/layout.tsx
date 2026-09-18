import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { site } from "@/data/site";
import "./globals.css";

// Self-hosted from src/fonts (SIL OFL). No request to a font CDN at runtime or build.
const publicSans = localFont({
  src: "../fonts/public-sans-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-public-sans",
  display: "swap",
});

const barlow = localFont({
  src: [
    { path: "../fonts/barlow-semi-condensed-latin-600-normal.woff2", weight: "600" },
    { path: "../fonts/barlow-semi-condensed-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-barlow",
  display: "swap",
  adjustFontFallback: "Arial",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  applicationName: site.name,
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0f2440",
  width: "device-width",
  initialScale: 1,
};

/**
 * Root layout: document shell and fonts only. The public site's chrome lives in
 * app/(site)/layout.tsx; the admin has its own layout in app/admin/layout.tsx.
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${publicSans.variable} ${barlow.variable}`}>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
