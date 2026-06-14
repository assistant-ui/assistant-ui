import type { ExtractResourceReturnType, ResourceElement } from "../core/types";
import {
  unmountResourceFiber,
  renderResourceFiber,
  commitResourceFiber,
} from "../core/ResourceFiber";
import { hasContextDepsChanged } from "../core/context";
import { useResourceFiberHost } from "./utils/useResourceFiberHostUtils";
import { useEffect, useMemo } from "react";
import { useRenderMemo } from "./utils/useRenderMemo";

export function useResource<E extends ResourceElement<any, any[]>>(
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

  useEffect(() => () => unmountResourceFiber(fiber), [fiber]);
  useEffect(() => {
    void result;
    commitResourceFiber(fiber);
  }, [fiber, result]);

  return result.value;
}
