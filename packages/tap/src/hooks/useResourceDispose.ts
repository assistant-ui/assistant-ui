import { useEffect, useInsertionEffect, useRef } from "react";
import { peekResourceFiber } from "../core/helpers/execution-context";

/**
 * Runs a callback when the current resource or React host is permanently
 * disposed. Soft unmounts preserve the callback for a later remount.
 */
export const useResourceDispose = (dispose: () => void): void => {
  const fiber = peekResourceFiber();
  const disposeRef = useRef(dispose);
  const callback = useRef(() => disposeRef.current()).current;

  useEffect(() => {
    disposeRef.current = dispose;
  });

  useEffect(() => {
    if (fiber === null) return;
    fiber.disposeCallbacks.add(callback);
  }, [callback, fiber]);

  useInsertionEffect(() => {
    if (fiber !== null) return undefined;
    return () => queueMicrotask(callback);
  }, [callback, fiber]);
};
