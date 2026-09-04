if (process.env.NODE_ENV === "development") {
  import("react-grab");
}

import posthog from "posthog-js";
import {
  getStoredConsent,
  hasGlobalPrivacyControl,
  isConsentRequired,
  subscribeToConsent,
} from "./lib/consent";
import { setUmamiTrackingEnabled } from "./lib/umami-sampling";

const apiKey = process.env.NEXT_PUBLIC_POSTHOG_API_KEY;

if (typeof window !== "undefined") {
  let started = false;
  const start = () => {
    if (!apiKey || started || hasGlobalPrivacyControl()) return;
    started = true;

    posthog.init(apiKey, {
      api_host: "/ph",
      ui_host: "https://us.posthog.com",
      defaults: "2025-11-30",
      autocapture: false,
      capture_exceptions: true,
    });

    window.posthog = {
      capture: (event, properties) => posthog.capture(event, properties),
    };
  };

  // The head script has already loaded umami by the time the banner is answered,
  // so a decline has to reach the running tracker rather than only the next load.
  subscribeToConsent((choice) => {
    setUmamiTrackingEnabled(choice === "granted");
    if (choice === "granted") start();
    else if (started) posthog.opt_out_capturing();
  });

  const consent = getStoredConsent();
  if (consent === "granted") {
    start();
  } else if (consent === null && apiKey) {
    void isConsentRequired().then((required) => {
      if (!required && getStoredConsent() === null) start();
    });
  }
}
