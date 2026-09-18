/**
 * Conversion tracking. Every CTA click and form submission fires a named event,
 * forwarded to Google Analytics 4, Google Ads and Meta Pixel when their IDs are
 * set. With no IDs set, nothing loads and `track` is a no-op.
 *
 * IDs come only from NEXT_PUBLIC_ env vars — never hardcode one.
 */

export const analyticsConfig = {
  gaId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || null,
  adsId: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || null,
  adsApplyLabel: process.env.NEXT_PUBLIC_GOOGLE_ADS_APPLY_LABEL || null,
  adsContactLabel: process.env.NEXT_PUBLIC_GOOGLE_ADS_CONTACT_LABEL || null,
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || null,
} as const;

export type TrackEventName =
  | "cta_click"
  | "call_click"
  | "text_click"
  | "email_click"
  | "application_step_complete"
  | "application_submit"
  | "contact_submit";

export type TrackParams = Record<string, string | number | boolean>;

type TagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: TagFn;
    fbq?: TagFn;
    dataLayer?: unknown[];
  }
}

export function track(event: TrackEventName, params: TrackParams = {}): void {
  if (typeof window === "undefined") return;
  const { gtag, fbq } = window;
  const { adsId, adsApplyLabel, adsContactLabel } = analyticsConfig;

  if (gtag) {
    gtag("event", event, params);
    if (adsId && event === "application_submit" && adsApplyLabel) {
      gtag("event", "conversion", { send_to: `${adsId}/${adsApplyLabel}` });
    }
    if (adsId && event === "contact_submit" && adsContactLabel) {
      gtag("event", "conversion", { send_to: `${adsId}/${adsContactLabel}` });
    }
  }

  if (fbq) {
    if (event === "application_submit") fbq("track", "Lead", params);
    else if (event === "contact_submit" || event === "call_click" || event === "text_click") {
      fbq("track", "Contact", params);
    } else fbq("trackCustom", event, params);
  }

  if (process.env.NODE_ENV === "development") {
    console.info("[track]", event, params);
  }
}
