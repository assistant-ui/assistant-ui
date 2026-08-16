import { useEffect, useRef } from "react";
import { useAssistantClientDestroySignal } from "@assistant-ui/store/client";

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

    return undefined;
  }, [destroySignal, enabled]);
};
