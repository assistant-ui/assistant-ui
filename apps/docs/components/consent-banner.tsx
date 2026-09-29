"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  CONSENT_REOPEN_EVENT,
  getStoredConsent,
  hasGlobalPrivacyControl,
  isConsentRequired,
  setStoredConsent,
  subscribeToConsent,
  type ConsentChoice,
} from "@/lib/consent";

export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const reopen = () => setVisible(true);
    window.addEventListener(CONSENT_REOPEN_EVENT, reopen);
    const unsubscribe = subscribeToConsent(() => setVisible(false));

    let cancelled = false;
    if (!hasGlobalPrivacyControl() && getStoredConsent() === null) {
      void isConsentRequired().then((required) => {
        if (!cancelled && required && getStoredConsent() === null) {
          setVisible(true);
        }
      });
    }

    return () => {
      cancelled = true;
      window.removeEventListener(CONSENT_REOPEN_EVENT, reopen);
      unsubscribe();
    };
  }, []);

  if (!visible) return null;

  const choose = (choice: ConsentChoice) => {
    setStoredConsent(choice);
    setVisible(false);
  };

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="bg-background fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-xl border p-4 shadow-lg"
    >
      <p className="text-muted-foreground text-sm">
        We use analytics cookies to understand how our docs are used. See our{" "}
        <Link
          href="/privacy-policy"
          className="text-foreground underline underline-offset-4"
        >
          Privacy Policy
        </Link>
        .
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => choose("denied")}>
          Decline
        </Button>
        <Button size="sm" onClick={() => choose("granted")}>
          Accept
        </Button>
      </div>
    </div>
  );
}
