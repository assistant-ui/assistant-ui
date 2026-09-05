import { useEffect, useInsertionEffect, useRef, useState } from "react";
import { useAssistantClientDestroySignal } from "@assistant-ui/store/internal";

export const useResourceCleanup = (enabled: boolean, cleanup: () => void) => {
  const destroySignal = useAssistantClientDestroySignal();
  const cleanupRef = useRef(cleanup);
  const enabledRef = useRef(enabled);
  const activeSignalRef = useRef(destroySignal);
  const [registered] = useState(() => new WeakSet<AbortSignal>());

  // Published in the mutation phase: a previous owner's abort is queued from
  // its insertion cleanup and runs before this commit's passive effects.
  useInsertionEffect(() => {
    cleanupRef.current = cleanup;
    enabledRef.current = enabled;
    activeSignalRef.current = destroySignal;
  });

  useEffect(() => {
    if (!enabled || !destroySignal) return undefined;

    const onAbort = () => {
      // A listener retained from a previous owner must not stop the resource
      // a later owner now holds.
      if (activeSignalRef.current !== destroySignal) return;
      if (enabledRef.current) cleanupRef.current();
    };
    if (destroySignal.aborted) {
      onAbort();
      return undefined;
    }
    if (registered.has(destroySignal)) return undefined;
    registered.add(destroySignal);
    destroySignal.addEventListener("abort", onAbort, { once: true });

    // The listener must survive standalone soft unmounts so a later permanent
    // client destroy still cleans up the retained resource state.
    return undefined;
  }, [destroySignal, enabled, registered]);
};
