import type { ExtractResourceReturnType, ResourceElement } from "../core/types";
import {
  deleteResourceFiber,
  unmountResourceFiber,
  renderResourceFiber,
  commitResourceFiber,
} from "../core/ResourceFiber";
import { hasContextDepsChanged } from "../core/context";
import { useResourceFiberHost } from "./utils/useResourceFiberHostUtils";
import { useEffect, useInsertionEffect, useMemo } from "react";
import { useRenderMemo } from "./utils/useRenderMemo";

export function useResource<E extends ResourceElement<any>>(
  element: E,
): ExtractResourceReturnType<E> {
  const { version, createFiber } = useResourceFiberHost();
  const fiber = useMemo(() => {
    return createFiber(element.hook, element.key);
  }, [element.hook, element.key, createFiber]);

  const result = useRenderMemo(
    () => ({ value: renderResourceFiber(fiber, element.args) }),
    [fiber, version, element.args],
    hasContextDepsChanged(fiber),
  );

  useInsertionEffect(() => {
    fiber.isDeleted = false;
    return () => deleteResourceFiber(fiber);
  }, [fiber]);
  useEffect(() => () => unmountResourceFiber(fiber, fiber.isDeleted), [fiber]);
  useEffect(() => {
    void result;
    commitResourceFiber(fiber);
  }, [fiber, result]);

  return result.value;
}
