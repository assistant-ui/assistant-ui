import { useEffect, useRef } from "react";
import { useAssistantClientDestroySignal } from "@assistant-ui/store/client";

export const useResourceCleanup = (cleanup: () => void) => {
  const destroySignal = useAssistantClientDestroySignal();
  const cleanupRef = useRef(cleanup);
  const registeredSignalRef = useRef<AbortSignal | undefined>(undefined);

  useEffect(() => {
    cleanupRef.current = cleanup;
  });

  useEffect(() => {
    if (!destroySignal) return () => cleanupRef.current();
    if (registeredSignalRef.current === destroySignal) return undefined;

    registeredSignalRef.current = destroySignal;
    destroySignal.addEventListener("abort", () => cleanupRef.current(), {
      once: true,
    });

    return undefined;
  }, [destroySignal]);
};
