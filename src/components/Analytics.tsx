"use client";

import Script from "next/script";
import { useEffect } from "react";
import { analyticsConfig, track } from "@/lib/analytics";

/**
 * Loads tracking scripts (only those whose ID is set) and fires `cta_click`,
 * `call_click`, `text_click` and `email_click` for every marked link. CTAs stay
 * server-rendered: they only need a `data-cta` attribute.
 */
export function Analytics() {
  const { gaId, adsId, metaPixelId } = analyticsConfig;
  const gtagId = gaId ?? adsId;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target instanceof Element ? e.target.closest("a, button") : null;
      if (!target) return;
      const cta = target.getAttribute("data-cta");
      const href = target.getAttribute("href") ?? "";
      const params = { cta: cta ?? "", page: window.location.pathname };
      if (href.startsWith("tel:")) track("call_click", params);
      else if (href.startsWith("sms:")) track("text_click", params);
      else if (href.startsWith("mailto:")) track("email_click", params);
      else if (cta) track("cta_click", params);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <>
      {gtagId ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gtagId}`} strategy="afterInteractive" />
          <Script id="gtag-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());${
              gaId ? `gtag('config',${JSON.stringify(gaId)});` : ""
            }${adsId ? `gtag('config',${JSON.stringify(adsId)});` : ""}`}
          </Script>
        </>
      ) : null}
      {metaPixelId ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(
            metaPixelId,
          )});fbq('track','PageView');`}
        </Script>
      ) : null}
    </>
  );
}
