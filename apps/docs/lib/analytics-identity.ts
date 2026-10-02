import { analytics } from "./analytics";

export const ANALYTICS_READY_EVENT = "aui-analytics-ready";

const SIGN_IN_STORAGE_KEY = "aui-demo-sign-in";

let userId: string | null = null;
let signedInFrom: string | null = null;
let listening = false;

// PostHog starts only once consent allows it, which can be after the session
// resolves, so the identity is held here and applied again when it starts.
const apply = () => {
  const posthog = window.posthog;
  if (!userId || !posthog?.identify) return;
  posthog.identify(userId);
  if (signedInFrom === null) return;
  analytics.demo.signedIn(signedInFrom);
  signedInFrom = null;
};

/**
 * Identifies the signed-in visitor by their accounts user id, and nothing else
 * about them. A signed-out answer leaves the identity alone, because only an
 * explicit sign-out says the browser changed hands.
 */
export function syncAnalyticsUser(id: string | null): void {
  if (typeof window === "undefined") return;
  let pending: string | null = null;
  try {
    pending = window.sessionStorage.getItem(SIGN_IN_STORAGE_KEY);
    window.sessionStorage.removeItem(SIGN_IN_STORAGE_KEY);
  } catch {}
  if (id === null) return;
  userId = id;
  signedInFrom ??= pending;
  if (window.posthog?.identify) return apply();
  if (listening) return;
  listening = true;
  window.addEventListener(ANALYTICS_READY_EVENT, apply, { once: true });
}

/** Forgets the signed-in visitor, so the next one on this browser starts anonymous. */
export function resetAnalyticsUser(): void {
  if (typeof window === "undefined") return;
  userId = null;
  signedInFrom = null;
  window.posthog?.reset?.();
}

/** Records a sign-in started from the demo; the return from accounts reports it as completed. */
export function trackDemoSignInClick(location: "sidebar" | "budget"): void {
  analytics.demo.signInClicked(location);
  try {
    window.sessionStorage.setItem(SIGN_IN_STORAGE_KEY, location);
  } catch {}
}
