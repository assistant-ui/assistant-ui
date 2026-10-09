import type {
  ExtractResourceReturnType,
  ResourceElement,
  ResourceFiber,
} from "../core/types";
import {
  unmountResourceFiber,
  unmountResourceFibers,
  renderResourceFiber,
  commitResourceFiber,
} from "../core/ResourceFiber";
import { hasContextDepsChanged } from "../core/context";
import {
  useHostLifecycle,
  useResourceFiberHost,
} from "./utils/useResourceFiberHostUtils";
import { useEffect, useMemo, useState } from "react";
import { useRenderMemo } from "./utils/useRenderMemo";
import { isThenable } from "../core/helpers/thenable";

type Hosted = {
  fiber: ResourceFiber<unknown>;
  key: string | number | undefined;
};

type Slot = "primary" | "fallback";

type BoundaryResult =
  | { fallback: null; value: unknown }
  | { fallback: Hosted; value: unknown; thenable: PromiseLike<unknown> };

const canReuse = (
  hosted: Hosted | undefined,
  hook: (...args: any[]) => unknown,
  key: string | number | undefined,
): hosted is Hosted =>
  hosted !== undefined &&
  hosted.fiber.hook === hook &&
  hosted.key === key &&
  !hosted.fiber.isReleased;

export function useSuspenseResource<
  E extends ResourceElement<any>,
  F extends ResourceElement<any>,
>(
  element: E,
  fallbackElement: F,
): ExtractResourceReturnType<E> | ExtractResourceReturnType<F> {
  const { version, createFiber } = useResourceFiberHost();
  const [hosted] = useState(() => new Map<Slot, Hosted>());
  const primary = useMemo((): Hosted => {
    const committed = hosted.get("primary");
    return canReuse(committed, element.hook, element.key)
      ? committed
      : { fiber: createFiber(element.hook, element.key), key: element.key };
  }, [hosted, element.hook, element.key, createFiber]);
  const [retryCount, setRetryCount] = useState(0);

  const committedFallback = hosted.get("fallback");
  const result = useRenderMemo(
    (): BoundaryResult => {
      void version;
      void retryCount;

      try {
        return {
          fallback: null,
          value: renderResourceFiber(primary.fiber, element.args),
        };
      } catch (error) {
        if (!isThenable(error)) throw error;

        const fallback = canReuse(
          committedFallback,
          fallbackElement.hook,
          fallbackElement.key,
        )
          ? committedFallback
          : {
              fiber: createFiber(fallbackElement.hook, fallbackElement.key),
              key: fallbackElement.key,
            };
        return {
          fallback,
          thenable: error,
          value: renderResourceFiber(fallback.fiber, fallbackElement.args),
        };
      }
    },
    [
      primary,
      version,
      retryCount,
      element.args,
      fallbackElement.hook,
      fallbackElement.key,
      fallbackElement.args,
    ],
    hasContextDepsChanged(primary.fiber) ||
      (committedFallback !== undefined &&
        hasContextDepsChanged(committedFallback.fiber)),
  );

  useHostLifecycle(hosted);
  useEffect(() => {
    const released: ResourceFiber<unknown>[] = [];
    for (const [slot, next] of [
      ["primary", primary],
      ["fallback", result.fallback],
    ] as const) {
      const prev = hosted.get(slot);
      if (prev !== undefined && prev !== next) released.push(prev.fiber);
      if (next !== null) hosted.set(slot, next);
      else hosted.delete(slot);
    }
    for (const fiber of released) fiber.isReleased = true;
    unmountResourceFibers(released);

    if (result.fallback !== null) {
      unmountResourceFiber(primary.fiber, false);
      commitResourceFiber(result.fallback.fiber);
    } else {
      commitResourceFiber(primary.fiber);
    }
  }, [hosted, primary, result]);

  useEffect(() => {
    if (result.fallback === null) return;
    let active = true;
    const retry = () => {
      if (active) setRetryCount((count) => count + 1);
    };
    result.thenable.then(retry, retry);
    return () => {
      active = false;
    };
  }, [result]);

  return result.value as
    | ExtractResourceReturnType<E>
    | ExtractResourceReturnType<F>;
}
