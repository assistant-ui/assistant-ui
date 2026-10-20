if (process.env.NODE_ENV === "development") {
  import("react-grab");
}

import posthog from "posthog-js";
import { ANALYTICS_READY_EVENT } from "./lib/analytics-identity";
import {
  getStoredConsent,
  hasGlobalPrivacyControl,
  isConsentRequired,
  subscribeToConsent,
} from "./lib/consent";
import { RENDERER_PATH } from "./lib/renderer";
import { setUmamiTrackingEnabled } from "./lib/umami-sampling";

const apiKey = process.env.NEXT_PUBLIC_POSTHOG_API_KEY;
const deploySha = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;

// reset() clears registered properties along with the identity, so a sign-out
// registers them again.
const registerSuperProperties = () =>
  posthog.register({
    app: "docs",
    ...(deploySha ? { deploy_sha: deploySha } : {}),
  });

if (
  typeof window !== "undefined" &&
  window.location.pathname !== RENDERER_PATH
) {
  let started = false;
  const start = () => {
    if (!apiKey || started || hasGlobalPrivacyControl()) return;
    started = true;

    posthog.init(apiKey, {
      api_host: "/ph",
      ui_host: "https://us.posthog.com",
      defaults: "2025-11-30",
      // What the defaults date already implies, pinned so bumping the date
      // cannot change how pageviews are counted.
      capture_pageview: "history_change",
      autocapture: false,
      capture_exceptions: true,
      mask_personal_data_properties: true,
    });
    // opt_out_capturing persists and init honors it on every later load, so an
    // accept that reverses a decline lifts it here, before the start is
    // announced and the waiting identity is applied.
    if (posthog.has_opted_out_capturing()) posthog.opt_in_capturing();
    registerSuperProperties();

    window.posthog = {
      capture: (event, properties) => posthog.capture(event, properties),
      // A decline leaves posthog loaded, and identify and group would still
      // write the identity to its cookie.
      identify: (distinctId) => {
        if (!posthog.has_opted_out_capturing()) posthog.identify(distinctId);
      },
      // reset() also clears posthog's stored opt-out, which a decline set and
      // which has to outlive the sign-out.
      reset: () => {
        const optedOut = posthog.has_opted_out_capturing();
        posthog.reset();
        if (optedOut) posthog.opt_out_capturing();
        registerSuperProperties();
      },
      group: (type, key) => {
        if (!posthog.has_opted_out_capturing()) posthog.group(type, key);
      },
    };
    window.dispatchEvent(new Event(ANALYTICS_READY_EVENT));
  };

  // An accept that reverses a decline on this page lifts the opt-out here; on
  // a later page, start() does.
  const allow = () => {
    if (!started) return start();
    if (posthog.has_opted_out_capturing()) posthog.opt_in_capturing();
  };

  // The head script has already loaded umami by the time the banner is answered,
  // so a decline has to reach the running tracker rather than only the next load.
  subscribeToConsent((choice) => {
    setUmamiTrackingEnabled(choice === "granted");
    if (choice === "granted") allow();
    else if (started) posthog.opt_out_capturing();
  });

  const consent = getStoredConsent();
  if (consent === "granted") {
    allow();
  } else if (consent === null && apiKey) {
    void isConsentRequired().then((required) => {
      if (!required && getStoredConsent() === null) allow();
    });
  }
}
