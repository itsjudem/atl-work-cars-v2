import type { Metadata } from "next";
import { absoluteUrl, assetUrl, site } from "@/data/site";

export const OG_IMAGE = {
  url: assetUrl("/og-image.png"),
  width: 1200,
  height: 630,
  alt: "ATL Work Cars — weekly car rentals for rideshare and delivery drivers in Metro Atlanta",
};

interface PageMetaInput {
  /** The COMPLETE title. Nothing is appended to it. */
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
}

/** Unique, complete metadata for one page, with canonical + social tags. */
export function pageMetadata({ title, description, path, noindex = false }: PageMetaInput): Metadata {
  const url = absoluteUrl(path);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: site.name,
      locale: site.locale,
      url,
      title,
      description,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE.url],
    },
    robots: noindex ? { index: false, follow: false } : { index: true, follow: true },
  };
}
