import { useEffect, useInsertionEffect, useRef } from "react";
import { peekResourceFiber } from "../core/helpers/execution-context";

/**
 * Runs a callback when the current resource or React host is permanently
 * disposed. Soft unmounts preserve the callback for a later remount.
 */
export const useResourceDispose = (dispose: () => void): void => {
  const fiber = peekResourceFiber();
  const stateRef = useRef({
    dispose,
    disposePending: false,
    passiveMounted: false,
    disposed: false,
  });
  const callback = useRef(() => {
    const state = stateRef.current;
    if (state.disposed) return;
    state.disposed = true;
    state.dispose();
  }).current;

  useEffect(() => {
    stateRef.current.dispose = dispose;
  });

  useInsertionEffect(() => {
    if (fiber !== null) return undefined;
    return () => {
      const state = stateRef.current;
      if (state.passiveMounted) {
        state.disposePending = true;
      } else {
        // A hidden React subtree has already consumed its passive cleanup.
        callback();
      }
    };
  }, [callback, fiber]);

  useEffect(() => {
    if (fiber !== null) {
      fiber.disposeCallbacks.add(callback);
      return undefined;
    }

    const state = stateRef.current;
    state.passiveMounted = true;
    return () => {
      state.passiveMounted = false;
      if (state.disposePending) callback();
    };
  }, [callback, fiber]);
};
