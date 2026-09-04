"use client";

import { useSyncExternalStore } from "react";
import { hasGlobalPrivacyControl, reopenConsentBanner } from "@/lib/consent";

const subscribe = () => () => {};

/**
 * `separator` draws the footer's leading dot, which has to disappear with the
 * link rather than survive it as a dangling bullet.
 */
export function CookieSettingsLink({ separator = false }) {
  // GPC already settles the answer, so there is nothing for the banner to ask.
  // The server cannot see the signal, hence the client-only snapshot.
  const available = useSyncExternalStore(
    subscribe,
    () => !hasGlobalPrivacyControl(),
    () => false,
  );
  if (!available) return null;

  return (
    <>
      {separator && <span aria-hidden>·</span>}
      <button
        type="button"
        onClick={reopenConsentBanner}
        className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4 transition-colors"
      >
        Cookie settings
      </button>
    </>
  );
}
