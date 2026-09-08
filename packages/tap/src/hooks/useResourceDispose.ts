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

  useInsertionEffect(
    () => () => {
      disposePendingRef.current = true;
    },
    [],
  );
  useEffect(
    () => () => {
      if (disposePendingRef.current) callback();
    },
    [callback],
  );
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
