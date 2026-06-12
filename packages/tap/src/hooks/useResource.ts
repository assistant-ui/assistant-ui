import type { ExtractResourceReturnType, ResourceElement } from "../core/types";
import {
  unmountResourceFiber,
  renderResourceFiber,
  commitResourceFiber,
} from "../core/ResourceFiber";
import { useResourceFiberHost } from "./utils/useResourceFiberHostUtils";
import { useEffect, useMemo } from "react";
import { useRenderMemo } from "./utils/useRenderMemo";

export function useResource<E extends ResourceElement<any, any[]>>(
  element: E,
): ExtractResourceReturnType<E>;
export function useResource<E extends ResourceElement<any, any[]>>(
  element: E,
  argsDeps: readonly unknown[],
): ExtractResourceReturnType<E>;
export function useResource<E extends ResourceElement<any, any[]>>(
  element: E,
  argsDeps?: readonly unknown[],
): ExtractResourceReturnType<E> {
  const { version, createFiber } = useResourceFiberHost();
  const fiber = useMemo(() => {
    return createFiber(element.hook, element.key);
  }, [element.hook, element.key, createFiber]);

  const identity = argsDeps ?? [element.args];

  const result = useRenderMemo(
    () => renderResourceFiber(fiber, element.args),
    [fiber, version, ...identity],
  );

  useEffect(() => () => unmountResourceFiber(fiber), [fiber]);
  useEffect(() => {
    commitResourceFiber(fiber, result);
  }, [fiber, result]);

  return result.value;
}
