"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { getStoredConsent, hasGlobalPrivacyControl } from "@/lib/consent";

export const analyticsAllowed = () =>
  !hasGlobalPrivacyControl() && getStoredConsent() !== "denied";

export function AnalyticsGate() {
  return (
    <>
      <Analytics beforeSend={(event) => (analyticsAllowed() ? event : null)} />
      <SpeedInsights
        beforeSend={(event) => (analyticsAllowed() ? event : null)}
      />
    </>
  );
}
