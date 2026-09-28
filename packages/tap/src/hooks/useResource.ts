import type { ExtractResourceReturnType, ResourceElement } from "../core/types";
import {
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

export function useResource<E extends ResourceElement<any>>(
  element: E,
): ExtractResourceReturnType<E> {
  const { version, createFiber } = useResourceFiberHost();
  const [host] = useState(() => ({
    fiber: createFiber(element.hook, element.key),
    key: element.key,
  }));
  const fiber = useMemo(
    () =>
      host.fiber.hook === element.hook &&
      host.key === element.key &&
      !host.fiber.isReleased
        ? host.fiber
        : createFiber(element.hook, element.key),
    [host, element.hook, element.key, createFiber],
  );

  const result = useRenderMemo(
    () => ({ value: renderResourceFiber(fiber, element.args) }),
    [fiber, version, element.args],
    hasContextDepsChanged(fiber),
  );

  useHostLifecycle(fiber);
  useEffect(() => {
    void result;
    host.fiber = fiber;
    host.key = element.key;
    commitResourceFiber(fiber);
  }, [host, fiber, element.key, result]);

  return result.value;
}
