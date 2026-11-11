"use client";

import { useEffect } from "react";

const apiKey = process.env.NEXT_PUBLIC_POSTHOG_API_KEY;

const privacyControl = () =>
  (navigator as { globalPrivacyControl?: boolean }).globalPrivacyControl ===
  true;

/**
 * Starts PostHog without cookies or storage: the setup keeps no identity
 * across visits, so it needs no consent banner. Nothing loads without a key
 * or under Global Privacy Control.
 */
export function Analytics() {
  useEffect(() => {
    if (!apiKey || privacyControl()) return;
    let cancelled = false;
    void import("posthog-js").then(({ default: posthog }) => {
      if (cancelled) return;
      posthog.init(apiKey, {
        api_host: "/ph",
        ui_host: "https://us.posthog.com",
        defaults: "2025-11-30",
        persistence: "memory",
        capture_pageview: "history_change",
        autocapture: false,
        mask_personal_data_properties: true,
      });
      posthog.register({ app: "setup" });
      window.posthog = {
        capture: (event, properties) => posthog.capture(event, properties),
        group: (type, key) => posthog.group(type, key),
      };
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
