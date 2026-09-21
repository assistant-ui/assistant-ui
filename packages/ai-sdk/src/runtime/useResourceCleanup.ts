import { useEffect, useRef } from "react";
import { useAssistantClientDestroySignal } from "@assistant-ui/store/internal";

export const useResourceCleanup = (
  enabled: boolean,
  cleanup: () => void,
  hostDestroySignal?: AbortSignal,
) => {
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
    const registration = new AbortController();
    const run = () => {
      if (registration.signal.aborted) return;
      registration.abort();
      if (enabledRef.current) cleanupRef.current();
    };
    if (hostDestroySignal?.aborted) {
      run();
      return undefined;
    }
    const options = { once: true, signal: registration.signal };
    destroySignal.addEventListener("abort", run, options);
    hostDestroySignal?.addEventListener("abort", run, options);

    // The listeners must survive standalone soft unmounts so a later
    // permanent destroy still cleans up the retained resource state.
    return undefined;
  }, [destroySignal, enabled, hostDestroySignal]);
};
