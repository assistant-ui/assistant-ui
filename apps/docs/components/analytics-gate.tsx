"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { getStoredConsent, hasGlobalPrivacyControl } from "@/lib/consent";

const allowed = () =>
  !hasGlobalPrivacyControl() && getStoredConsent() !== "denied";

export function AnalyticsGate() {
  return (
    <>
      <Analytics beforeSend={(event) => (allowed() ? event : null)} />
      <SpeedInsights beforeSend={(event) => (allowed() ? event : null)} />
    </>
  );
}
