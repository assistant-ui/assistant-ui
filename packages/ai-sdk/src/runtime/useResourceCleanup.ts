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
  const registrationRef = useRef<{
    destroySignal: AbortSignal | undefined;
    hostDestroySignal: AbortSignal | undefined;
    controller: AbortController;
  } | null>(null);

  useEffect(() => {
    cleanupRef.current = cleanup;
    enabledRef.current = enabled;
  });

  useEffect(() => {
    if (!enabled || (!destroySignal && !hostDestroySignal)) return undefined;
    const current = registrationRef.current;
    if (
      current !== null &&
      current.destroySignal === destroySignal &&
      current.hostDestroySignal === hostDestroySignal
    ) {
      return undefined;
    }
    current?.controller.abort();

    const registration = new AbortController();
    registrationRef.current = {
      destroySignal,
      hostDestroySignal,
      controller: registration,
    };
    const run = () => {
      if (registration.signal.aborted) return;
      registration.abort();
      if (enabledRef.current) cleanupRef.current();
    };
    if (destroySignal?.aborted || hostDestroySignal?.aborted) {
      run();
      return undefined;
    }
    const options = { once: true, signal: registration.signal };
    destroySignal?.addEventListener("abort", run, options);
    hostDestroySignal?.addEventListener("abort", run, options);

    // The listeners must survive standalone soft unmounts so a later
    // permanent destroy still cleans up the retained resource state.
    return undefined;
  }, [destroySignal, enabled, hostDestroySignal]);
};
