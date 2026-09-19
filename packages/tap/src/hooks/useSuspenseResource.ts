import type {
  ExtractResourceReturnType,
  ResourceElement,
  ResourceFiber,
} from "../core/types";
import {
  unmountResourceFiber,
  renderResourceFiber,
  commitResourceFiber,
} from "../core/ResourceFiber";
import { hasContextDepsChanged } from "../core/context";
import { useResourceFiberHost } from "./utils/useResourceFiberHostUtils";
import { useEffect, useMemo, useState } from "react";
import { useRenderMemo } from "./utils/useRenderMemo";
import { isThenable } from "../core/helpers/thenable";

type BoundaryState = {
  fallbackFiber: ResourceFiber<unknown> | null;
  fallbackHook: ((...args: any[]) => unknown) | null;
  retiredFallbackFibers: ResourceFiber<unknown>[];
  subscribedTo: PromiseLike<unknown> | null;
  disposed: boolean;
};

type BoundaryResult =
  | { suspended: false; value: unknown }
  | { suspended: true; value: unknown; thenable: PromiseLike<unknown> };

export function useSuspenseResource<
  E extends ResourceElement<any>,
  F extends ResourceElement<any>,
>(
  element: E,
  fallbackElement: F,
): ExtractResourceReturnType<E> | ExtractResourceReturnType<F> {
  const { version, createFiber } = useResourceFiberHost();
  const fiber = useMemo(() => {
    return createFiber(element.hook, element.key);
  }, [element.hook, element.key, createFiber]);

  const [state] = useState<BoundaryState>(() => ({
    fallbackFiber: null,
    fallbackHook: null,
    retiredFallbackFibers: [],
    subscribedTo: null,
    disposed: false,
  }));
  const [retryCount, setRetryCount] = useState(0);

  const result = useRenderMemo(
    (): BoundaryResult => {
      void version;
      void retryCount;

      try {
        return {
          suspended: false,
          value: renderResourceFiber(fiber, element.args),
        };
      } catch (error) {
        if (!isThenable(error)) throw error;

        if (
          state.fallbackFiber !== null &&
          state.fallbackHook !== fallbackElement.hook
        ) {
          state.retiredFallbackFibers.push(state.fallbackFiber);
          state.fallbackFiber = null;
        }
        state.fallbackFiber ??= createFiber(
          fallbackElement.hook,
          fallbackElement.key,
        );
        state.fallbackHook = fallbackElement.hook;

        return {
          suspended: true,
          thenable: error,
          value: renderResourceFiber(state.fallbackFiber, fallbackElement.args),
        };
      }
    },
    [
      fiber,
      version,
      retryCount,
      element.args,
      fallbackElement.hook,
      fallbackElement.key,
      fallbackElement.args,
    ],
    hasContextDepsChanged(fiber) ||
      (state.fallbackFiber !== null &&
        hasContextDepsChanged(state.fallbackFiber)),
  );

  useEffect(
    () => () => {
      state.disposed = true;
      if (state.fallbackFiber !== null)
        unmountResourceFiber(state.fallbackFiber);
      for (const retired of state.retiredFallbackFibers)
        unmountResourceFiber(retired);
    },
    [state],
  );
  useEffect(() => () => unmountResourceFiber(fiber), [fiber]);
  useEffect(() => {
    while (state.retiredFallbackFibers.length > 0)
      unmountResourceFiber(state.retiredFallbackFibers.pop()!);

    if (result.suspended) {
      unmountResourceFiber(fiber);
      commitResourceFiber(state.fallbackFiber!);

      const thenable = result.thenable;
      if (state.subscribedTo !== thenable) {
        state.subscribedTo = thenable;
        const retry = () => {
          if (state.disposed) return;
          setRetryCount((count) => count + 1);
        };
        thenable.then(retry, retry);
      }
    } else {
      if (state.fallbackFiber !== null) {
        unmountResourceFiber(state.fallbackFiber);
        state.fallbackFiber = null;
        state.fallbackHook = null;
        state.subscribedTo = null;
      }
      commitResourceFiber(fiber);
    }
  }, [fiber, state, result]);

  return result.value as
    | ExtractResourceReturnType<E>
    | ExtractResourceReturnType<F>;
}
