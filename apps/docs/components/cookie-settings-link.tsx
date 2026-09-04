"use client";

import { useSyncExternalStore } from "react";
import { hasGlobalPrivacyControl, reopenConsentBanner } from "@/lib/consent";

const subscribe = () => () => {};

export function CookieSettingsLink() {
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
      <span aria-hidden>·</span>
      <button
        type="button"
        onClick={reopenConsentBanner}
        className="text-muted-foreground hover:text-foreground text-sm transition-colors"
      >
        Cookie settings
      </button>
    </>
  );
}
