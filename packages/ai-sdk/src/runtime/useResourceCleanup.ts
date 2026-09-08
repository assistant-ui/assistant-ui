import { useEffect, useRef } from "react";
import { useAssistantClientDestroySignal } from "@assistant-ui/store/internal";

type CleanupRegistration = {
  cleanupRef: { current: () => void };
  enabledRef: { current: boolean };
};

const registrations = new WeakMap<AbortSignal, Set<CleanupRegistration>>();

export const useResourceCleanup = (enabled: boolean, cleanup: () => void) => {
  const destroySignal = useAssistantClientDestroySignal();
  const cleanupRef = useRef(cleanup);
  const enabledRef = useRef(enabled);
  const registeredSignalRef = useRef<AbortSignal | undefined>(undefined);

  useEffect(() => {
    cleanupRef.current = cleanup;
    enabledRef.current = enabled;
  });

  useEffect(() => {
    if (!enabled || !destroySignal) return undefined;
    if (registeredSignalRef.current === destroySignal) return undefined;

    registeredSignalRef.current = destroySignal;
    const registration = { cleanupRef, enabledRef };
    const signalRegistrations = registrations.get(destroySignal);
    if (signalRegistrations) {
      signalRegistrations.add(registration);
      return undefined;
    }

    const registrationsForSignal = new Set([registration]);
    registrations.set(destroySignal, registrationsForSignal);
    destroySignal.addEventListener(
      "abort",
      () => {
        registrations.delete(destroySignal);
        for (const entry of registrationsForSignal) {
          if (entry.enabledRef.current) entry.cleanupRef.current();
        }
      },
      { once: true },
    );

    // The listener must survive standalone soft unmounts so a later permanent
    // client destroy still cleans up the retained resource state.
    return undefined;
  }, [destroySignal, enabled]);
};
