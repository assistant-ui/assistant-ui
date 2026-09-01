if (process.env.NODE_ENV === "development") {
  import("react-grab");
}

import posthog from "posthog-js";
import {
  CONSENT_CHANGE_EVENT,
  getStoredConsent,
  hasGlobalPrivacyControl,
  isConsentRequired,
} from "./lib/consent";

const apiKey = process.env.NEXT_PUBLIC_POSTHOG_API_KEY;

if (apiKey && typeof window !== "undefined" && !hasGlobalPrivacyControl()) {
  let started = false;
  const start = () => {
    if (started) return;
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

  const consent = getStoredConsent();
  if (consent === "granted") {
    start();
  } else if (consent === null) {
    window.addEventListener(CONSENT_CHANGE_EVENT, (event) => {
      if ((event as CustomEvent).detail === "granted") start();
    });
    void isConsentRequired().then((required) => {
      if (!required && getStoredConsent() === null) start();
    });
  }
}
