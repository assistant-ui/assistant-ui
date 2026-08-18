import { useEffect, useRef } from "react";
import { useAssistantClientDestroySignal } from "@assistant-ui/store/internal";

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
    destroySignal.addEventListener(
      "abort",
      () => {
        if (enabledRef.current) cleanupRef.current();
      },
      { once: true },
    );

    // The listener must survive standalone soft unmounts so a later permanent
    // client destroy still cleans up the retained resource state.
    return undefined;
  }, [destroySignal, enabled]);
};
