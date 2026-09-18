/**
 * Business contact details and site-wide constants. This is the ONLY place a
 * phone number, email address, hours or base URL is written down.
 *
 * The values below are the sanctioned placeholders from the build brief.
 * Replace them here (one line each) when the real details are confirmed, and
 * flip the matching `...IsPlaceholder` flag to false.
 */
export const site = {
  name: "ATL Work Cars",
  /** Canonical origin. Used for every canonical URL, sitemap entry and OG image. */
  url: "https://atlworkcars.com",
  phoneDisplay: "(770) 000-0000",
  /** E.164, used for tel: and sms: links. */
  phoneE164: "+17700000000",
  /** While true, the phone is kept out of structured data. */
  phoneIsPlaceholder: true,
  email: "info@atlworkcars.com",
  hours: "Hours to be confirmed",
  /** No street address is published. The service area is shown instead. */
  streetAddress: null,
  regionLabel: "Metro Atlanta",
  locale: "en_US",
} as const;

/** Rendered wherever a business fact is not known yet. */
export const UNKNOWN_FALLBACK = "Contact us / Apply for current details";

/** Rendered wherever a vehicle's price or deposit is not known yet. */
export const PRICE_FALLBACK = "Contact us for pricing";

export const telHref = `tel:${site.phoneE164}`;
export const smsHref = `sms:${site.phoneE164}`;
export const mailtoHref = `mailto:${site.email}`;

/** Build an absolute URL on the canonical origin. Paths always end in "/". */
export function absoluteUrl(path: string): string {
  const withSlash = path.endsWith("/") ? path : `${path}/`;
  return new URL(withSlash, site.url).toString();
}

/** Absolute URL for a file (no trailing slash added), e.g. the OG image. */
export function assetUrl(path: string): string {
  return new URL(path, site.url).toString();
}
