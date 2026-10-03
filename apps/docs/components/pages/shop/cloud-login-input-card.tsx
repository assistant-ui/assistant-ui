"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import { useWizardNext } from "./wizard-actions";
import { inputCardClassName, useInputActions } from "./input-shared";
import { canRestoreCheckoutSession } from "@/lib/checkout/session-store";
import type { Checkout } from "@/lib/checkout/protocol";
import {
  cloudLoginDetails,
  rememberCloudLogin,
  returnedToCloudLogin,
} from "@/lib/checkout/cloud-login";

export function CloudLoginInputCard({
  input,
  checkout,
}: {
  input: Checkout.Input;
  checkout: CheckoutContextValue;
}) {
  const details = cloudLoginDetails(input);
  const [failure, setFailure] = useState("");
  const { busy, dismiss } = useInputActions(input, checkout);
  const returned = useSyncExternalStore(
    useCallback((notify) => {
      window.addEventListener("hashchange", notify);
      return () => window.removeEventListener("hashchange", notify);
    }, []),
    () => {
      try {
        return returnedToCloudLogin(
          input,
          checkout.session.id,
          window.location.hash,
          window.sessionStorage,
        );
      } catch {
        return false;
      }
    },
    () => false,
  );
  const expiresAt = details?.expiresAt ?? 0;
  const expired = useSyncExternalStore(
    useCallback(
      (notify) => {
        const remaining = expiresAt - Date.now();
        if (remaining <= 0) return () => {};
        const timer = setTimeout(notify, remaining);
        return () => clearTimeout(timer);
      },
      [expiresAt],
    ),
    () => expiresAt <= Date.now(),
    () => false,
  );
  const signIn = () => {
    setFailure("");
    if (!details || expired) return;
    if (!canRestoreCheckoutSession(checkout.session.id, checkout.url)) {
      setFailure(
        "Allow browser storage to return to this setup, or use the sign-in link printed by your CLI.",
      );
      return;
    }
    let remembered = false;
    try {
      remembered = rememberCloudLogin(
        input,
        checkout.session.id,
        window.sessionStorage,
      );
    } catch {}
    if (!remembered) {
      setFailure(
        "Allow browser storage to return to this setup after sign-in.",
      );
      return;
    }
    window.location.assign(details.href);
  };
  useWizardNext({
    label: returned ? "Waiting for CLI" : "Sign in",
    disabled: busy || !details || expired || returned,
    onClick: signIn,
  });
  return (
    <div className={inputCardClassName}>
      {!details ? (
        <p role="alert">
          This sign-in request is invalid. Ask your agent to restart it.
        </p>
      ) : expired ? (
        <p role="status">
          This code expired. Ask your agent to start sign-in again.
        </p>
      ) : (
        <>
          <p className="text-muted-foreground text-base sm:text-sm">
            {returned
              ? "Waiting for your CLI to finish sign-in."
              : "Approve assistant-ui-cli on the accounts page, then return here."}
          </p>
          <div className="flex flex-col gap-2">
            <span className="font-mono text-lg" aria-label="Sign-in code">
              {details.code}
            </span>
            <span className="text-muted-foreground text-base sm:text-sm">
              {details.host}
            </span>
          </div>
        </>
      )}
      {failure ? (
        <p role="alert" className="text-destructive text-base sm:text-sm">
          {failure}
        </p>
      ) : null}
      <Button
        type="button"
        variant="link"
        disabled={busy}
        onClick={() => void dismiss()}
        className="text-muted-foreground hover:text-foreground relative self-start px-0"
      >
        Cancel sign-in
        <span
          className="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden"
          aria-hidden="true"
        />
      </Button>
    </div>
  );
}
