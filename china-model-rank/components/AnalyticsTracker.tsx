"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

declare global {
  interface Window {
    gtag?: (
      command: "config" | "event" | "js",
      targetId: string | Date,
      config?: Record<string, unknown>
    ) => void;
  }
}

function getSessionId() {
  const key = "cmr_session_id";
  const existing = window.sessionStorage.getItem(key);
  if (existing) {
    return existing;
  }

  const id = crypto.randomUUID();
  window.sessionStorage.setItem(key, id);
  return id;
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    const endpoint = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT;
    if (!gaMeasurementId && (process.env.NEXT_PUBLIC_DISABLE_ANALYTICS === "1" || !endpoint)) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    const path = `${pathname}${params.size ? `?${params.toString()}` : ""}`;

    if (gaMeasurementId && typeof window.gtag === "function") {
      window.gtag("event", "page_view", {
        send_to: gaMeasurementId,
        page_title: document.title,
        page_location: window.location.href,
        page_path: path
      });
    }

    if (process.env.NEXT_PUBLIC_DISABLE_ANALYTICS === "1" || !endpoint) {
      return;
    }

    const payload = {
      path,
      referrer: document.referrer || null,
      sessionId: getSessionId(),
      utmSource: params.get("utm_source"),
      utmMedium: params.get("utm_medium"),
      utmCampaign: params.get("utm_campaign")
    };

    navigator.sendBeacon?.(endpoint, new Blob([JSON.stringify(payload)], { type: "application/json" })) ||
      fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(() => undefined);
  }, [pathname, searchParams]);

  return null;
}
