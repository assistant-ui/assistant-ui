import { useCallback, useEffect, useRef } from "react";
import { useResourceDispose } from "@assistant-ui/tap";
import { useAssistantClientDestroySignal } from "@assistant-ui/store/internal";

export const useResourceCleanup = (enabled: boolean, cleanup: () => void) => {
  const destroySignal = useAssistantClientDestroySignal();
  const stateRef = useRef<{
    cleanup: () => void;
    cleaned: boolean;
    registration: {
      signal: AbortSignal;
      listener: () => void;
    } | null;
  }>({ cleanup, cleaned: false, registration: null });

  useEffect(() => {
    stateRef.current.cleanup = cleanup;
  });

  const removeRegistration = useCallback(() => {
    const state = stateRef.current;
    const registration = state.registration;
    if (registration === null) return;
    state.registration = null;
    registration.signal.removeEventListener("abort", registration.listener);
  }, []);

  const dispose = useCallback(() => {
    const state = stateRef.current;
    removeRegistration();
    if (state.cleaned) return;
    state.cleaned = true;
    state.cleanup();
  }, [removeRegistration]);

  useResourceDispose(dispose);

  useEffect(() => {
    const current = stateRef.current.registration;
    if (current !== null && (current.signal !== destroySignal || !enabled)) {
      removeRegistration();
    }
    if (!enabled || !destroySignal || stateRef.current.cleaned) {
      return undefined;
    }
    if (stateRef.current.registration?.signal === destroySignal) {
      return undefined;
    }

    const listener = () => dispose();
    stateRef.current.registration = { signal: destroySignal, listener };
    if (destroySignal.aborted) dispose();
    else destroySignal.addEventListener("abort", listener, { once: true });

    return undefined;
  }, [destroySignal, dispose, enabled, removeRegistration]);
};
