"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import {
  followAnalyticsConsent,
  getStoredConsent,
  hasGlobalPrivacyControl,
} from "@/lib/consent";

const analyticsAllowed = () =>
  !hasGlobalPrivacyControl() && getStoredConsent() !== "denied";

// Custom events carry search queries and clicks, so they follow PostHog's rule
// rather than the cookieless page views' one: in a consent region they wait for
// an accept.
let customEventsAllowed = false;
if (typeof window !== "undefined") {
  followAnalyticsConsent((allowed) => {
    customEventsAllowed = allowed;
  });
}

export function AnalyticsGate() {
  return (
    <>
      <Analytics
        beforeSend={(event) =>
          analyticsAllowed() && (event.type !== "event" || customEventsAllowed)
            ? event
            : null
        }
      />
      <SpeedInsights
        beforeSend={(event) => (analyticsAllowed() ? event : null)}
      />
    </>
  );
}
