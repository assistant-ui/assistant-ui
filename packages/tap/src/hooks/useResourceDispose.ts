import { useEffect, useInsertionEffect, useRef } from "react";
import { peekResourceFiber } from "../core/helpers/execution-context";
import type { ResourceFiber } from "../core/types";

const useTapResourceDispose = (
  fiber: ResourceFiber<unknown>,
  callback: () => void,
) => {
  useEffect(() => {
    fiber.disposeCallbacks.add(callback);
  }, [callback, fiber]);
};

const useReactHostDispose = (callback: () => void) => {
  const disposePendingRef = useRef(false);
  const passiveMountedRef = useRef(false);
  const disposedRef = useRef(false);
  const runDispose = useRef(() => {
    if (disposedRef.current) return;
    disposedRef.current = true;
    callback();
  }).current;

  useInsertionEffect(
    () => () => {
      if (passiveMountedRef.current) {
        disposePendingRef.current = true;
      } else {
        // A hidden React subtree has already consumed its passive cleanup.
        runDispose();
      }
    },
    [runDispose],
  );
  useEffect(() => {
    passiveMountedRef.current = true;
    return () => {
      passiveMountedRef.current = false;
      if (disposePendingRef.current) runDispose();
    };
  }, [runDispose]);
};

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

  if (fiber === null) {
    // oxlint-disable-next-line react-hooks/rules-of-hooks
    useReactHostDispose(callback);
  } else {
    // oxlint-disable-next-line react-hooks/rules-of-hooks
    useTapResourceDispose(fiber, callback);
  }
};
