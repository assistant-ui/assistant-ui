if (process.env.NODE_ENV === "development") {
  import("react-grab");
}

import {
  ANALYTICS_READY_EVENT,
  forgetDemoSignIn,
} from "./lib/analytics-identity";
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

if (
  typeof window !== "undefined" &&
  window.location.pathname !== RENDERER_PATH
) {
  let consent = getStoredConsent();
  let allowed = false;
  let posthog:
    | ReturnType<typeof import("./lib/posthog-client").startPostHog>
    | undefined;
  let loading: Promise<void> | undefined;

  const allow = () => {
    allowed = true;
    if (!apiKey || hasGlobalPrivacyControl()) return;
    if (posthog) {
      if (posthog.has_opted_out_capturing()) posthog.opt_in_capturing();
      return;
    }
    loading ??= import("./lib/posthog-client")
      .then(({ startPostHog }) => {
        if (!allowed || hasGlobalPrivacyControl()) return;
        posthog = startPostHog(apiKey, deploySha);
        window.dispatchEvent(new Event(ANALYTICS_READY_EVENT));
      })
      .catch(() => {})
      .finally(() => {
        loading = undefined;
      });
  };

  // The head script has already loaded umami by the time the banner is answered,
  // so a decline has to reach the running tracker rather than only the next load.
  subscribeToConsent((choice) => {
    consent = choice;
    allowed = choice === "granted";
    setUmamiTrackingEnabled(choice === "granted");
    if (choice === "granted") return allow();
    forgetDemoSignIn();
    posthog?.opt_out_capturing();
  });

  if (consent === "granted") {
    allow();
  } else if (consent === null && apiKey) {
    void isConsentRequired().then((required) => {
      if (!required && consent === null) allow();
    });
  }
}
