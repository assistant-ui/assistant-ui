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
  // The server cannot see the signal and assumes it is absent, which is both the
  // common case and the one that leaves the sentence around this link complete.
  const available = useSyncExternalStore(
    subscribe,
    () => !hasGlobalPrivacyControl(),
    () => true,
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

export function CookieSettingsNotice() {
  const gpc = useSyncExternalStore(
    subscribe,
    hasGlobalPrivacyControl,
    () => false,
  );

  if (gpc) {
    return (
      <>
        Your browser is opting you out through Global Privacy Control, so there
        is no choice here for you to change.
      </>
    );
  }

  return (
    <>
      You can change your choice at any time with the <CookieSettingsLink />{" "}
      control here, or from the footer of our main site pages.
    </>
  );
}
